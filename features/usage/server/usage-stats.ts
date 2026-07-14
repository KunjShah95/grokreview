import { prisma } from "@/lib/db";
import { getUserInstallationId } from "@/features/github/server/installation";
import { getUserSubscription } from "@/features/billing/server/subscription";
import { startOfMonth, subMonths, format } from "date-fns";

export type DetailedUsageStats = {
  /** Current billing period usage */
  current: {
    used: number;
    limit: number | null; // null = unlimited
    remaining: number | null;
    percentage: number; // 0-100
  };
  /** Monthly history for the past 6 months */
  monthlyHistory: Array<{
    month: string; // "Jan 2024"
    count: number;
  }>;
  /** Usage by model/provider */
  byModel: Array<{
    model: string;
    count: number;
    percentage: number;
  }>;
  /** Reviews per day (last 30 days) for mini chart */
  dailyActivity: Array<{
    date: string;
    count: number;
  }>;
  /** Total reviews all time */
  totalReviews: number;
  /** Average reviews per day this month */
  avgPerDay: number;
  /** Days until billing reset */
  daysUntilReset: number;
  /** Cost estimate (if available) */
  costEstimate: {
    total: number;
    byProvider: Array<{ provider: string; cost: number }>;
  };
};

const MODEL_COSTS: Record<string, number> = {
  "groq/llama3-70b-8192": 0.00059,
  "groq/llama3-8b-8192": 0.00005,
  "groq/mixtral-8x7b-32768": 0.00024,
  "mistral/mistral-large-latest": 0.002,
  "mistral/open-mistral-nemo": 0.0003,
  "openrouter/openrouter/free": 0,
  "openrouter/openrouter/auto": 0.001,
};

/**
 * Get detailed usage statistics for the analytics dashboard.
 */
export async function getDetailedUsage(userId: string): Promise<DetailedUsageStats> {
  const installationId = await getUserInstallationId(userId);
  if (!installationId) {
    return {
      current: { used: 0, limit: 5, remaining: 5, percentage: 0 },
      monthlyHistory: [],
      byModel: [],
      dailyActivity: [],
      totalReviews: 0,
      avgPerDay: 0,
      daysUntilReset: daysUntilEndOfMonth(),
      costEstimate: { total: 0, byProvider: [] },
    };
  }

  // Current month usage
  const subscription = await getUserSubscription(userId);
  const monthStart = startOfMonth(new Date());
  const limit = subscription.plan === "pro" && subscription.status === "active" ? null : 5;

  const reviewedThisMonth = await prisma.pullRequest.count({
    where: {
      installationId,
      status: "reviewed",
      reviewedAt: { gte: monthStart },
    },
  });

  // Monthly history (past 6 months)
  const monthlyHistory: Array<{ month: string; count: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStartDate = startOfMonth(monthDate);
    const monthEndDate = i === 0 ? new Date() : startOfMonth(subMonths(monthDate, -1));

    const count = await prisma.pullRequest.count({
      where: {
        installationId,
        status: "reviewed",
        reviewedAt: {
          gte: monthStartDate,
          lt: monthEndDate,
        },
      },
    });

    monthlyHistory.push({
      month: format(monthDate, "MMM yyyy"),
      count,
    });
  }

  // Usage by model
  const modelCounts = await prisma.pullRequest.groupBy({
    by: ["model"],
    where: {
      installationId,
      status: "reviewed",
      model: { not: null },
    },
    _count: { model: true },
    orderBy: { _count: { model: "desc" } },
  });

  const totalReviewed = modelCounts.reduce((sum, m) => sum + m._count.model, 0);
  const byModel = modelCounts.map((m) => ({
    model: m.model as string,
    count: m._count.model,
    percentage: totalReviewed > 0 ? Math.round((m._count.model / totalReviewed) * 100) : 0,
  }));

  // Daily activity for mini chart
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const recentReviews = await prisma.pullRequest.findMany({
    where: {
      installationId,
      status: "reviewed",
      reviewedAt: { gte: thirtyDaysAgo },
    },
    select: { reviewedAt: true },
    orderBy: { reviewedAt: "asc" },
  });

  const dayMap = new Map<string, number>();
  for (const r of recentReviews) {
    if (!r.reviewedAt) continue;
    const day = r.reviewedAt.toISOString().split("T")[0];
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }

  const dailyActivity = Array.from(dayMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Total reviews
  const totalReviews = await prisma.pullRequest.count({
    where: { installationId, status: "reviewed" },
  });

  // Cost estimation
  let totalCost = 0;
  const costByProvider = new Map<string, number>();

  const reviewedPullRequests = await prisma.pullRequest.findMany({
    where: {
      installationId,
      status: "reviewed",
      model: { not: null },
    },
    select: { model: true },
    take: 1000,
  });

  for (const pr of reviewedPullRequests) {
    if (!pr.model) continue;
    const cost = MODEL_COSTS[pr.model] ?? 0.0001;
    totalCost += cost;
    const provider = pr.model.split("/")[0];
    costByProvider.set(provider, (costByProvider.get(provider) || 0) + cost);
  }

  const remaining = limit !== null ? Math.max(0, limit - reviewedThisMonth) : null;
  const percentage = limit !== null ? Math.min(100, Math.round((reviewedThisMonth / limit) * 100)) : 0;
  const activeDays = dayMap.size;
  const avgPerDay = activeDays > 0 ? Math.round((reviewedThisMonth / activeDays) * 10) / 10 : 0;

  return {
    current: {
      used: reviewedThisMonth,
      limit,
      remaining,
      percentage,
    },
    monthlyHistory,
    byModel,
    dailyActivity,
    totalReviews,
    avgPerDay,
    daysUntilReset: daysUntilEndOfMonth(),
    costEstimate: {
      total: Math.round(totalCost * 100) / 100,
      byProvider: Array.from(costByProvider.entries()).map(([provider, cost]) => ({
        provider,
        cost: Math.round(cost * 100) / 100,
      })),
    },
  };
}

function daysUntilEndOfMonth(): number {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
