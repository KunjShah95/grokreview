import { prisma } from "@/lib/db";
import { getUserInstallationId } from "@/features/github/server/installation";

export type ReviewAnalytics = {
  totalReviews: number;
  reviewsThisMonth: number;
  averageReviewTime: number | null;
  reviewsByDay: Array<{ date: string; count: number }>;
  reviewsByStatus: Array<{ status: string; count: number }>;
  topRepositories: Array<{ repoFullName: string; count: number }>;
  modelUsage: Array<{ model: string; count: number }>;
};

export async function getReviewAnalytics(userId: string): Promise<ReviewAnalytics> {
  const installationId = await getUserInstallationId(userId);
  if (!installationId) {
    return {
      totalReviews: 0,
      reviewsThisMonth: 0,
      averageReviewTime: null,
      reviewsByDay: [],
      reviewsByStatus: [],
      topRepositories: [],
      modelUsage: [],
    };
  }

  // Total reviews
  const totalReviews = await prisma.pullRequest.count({
    where: { installationId, status: "reviewed" },
  });

  // Reviews this month
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const reviewsThisMonth = await prisma.pullRequest.count({
    where: {
      installationId,
      status: "reviewed",
      reviewedAt: { gte: firstOfMonth },
    },
  });

  // Reviews by status
  const statusCounts = await prisma.pullRequest.groupBy({
    by: ["status"],
    where: { installationId },
    _count: { status: true },
  });

  const reviewsByStatus = statusCounts.map((s) => ({
    status: s.status,
    count: s._count.status,
  }));

  // Model usage (only for reviewed PRs)
  const modelCounts = await prisma.pullRequest.groupBy({
    by: ["model"],
    where: {
      installationId,
      status: "reviewed",
      model: { not: null },
    },
    _count: { model: true },
    orderBy: { _count: { model: "desc" } },
    take: 10,
  });

  const modelUsage = modelCounts.map((m) => ({
    model: m.model as string,
    count: m._count.model,
  }));

  // Reviews by day (last 30 days)
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

  // Group by day
  const dayMap = new Map<string, number>();
  for (const review of recentReviews) {
    if (!review.reviewedAt) continue;
    const day = review.reviewedAt.toISOString().split("T")[0];
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }

  const reviewsByDay = Array.from(dayMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Top repositories
  const repoCounts = await prisma.pullRequest.groupBy({
    by: ["repoFullName"],
    where: { installationId },
    _count: { repoFullName: true },
    orderBy: { _count: { repoFullName: "desc" } },
    take: 10,
  });

  const topRepositories = repoCounts.map((r) => ({
    repoFullName: r.repoFullName,
    count: r._count.repoFullName,
  }));

  // Average review time (from createdAt to reviewedAt in minutes)
  const timedReviews = await prisma.pullRequest.findMany({
    where: {
      installationId,
      status: "reviewed",
      reviewedAt: { not: null },
    },
    select: { createdAt: true, reviewedAt: true },
    take: 100,
  });

  let totalMinutes = 0;
  let timedCount = 0;
  for (const r of timedReviews) {
    if (!r.reviewedAt) continue;
    const diffMs = r.reviewedAt.getTime() - r.createdAt.getTime();
    totalMinutes += diffMs / 60000;
    timedCount++;
  }

  const averageReviewTime = timedCount > 0 ? Math.round(totalMinutes / timedCount) : null;

  return {
    totalReviews,
    reviewsThisMonth,
    averageReviewTime,
    reviewsByDay,
    reviewsByStatus,
    topRepositories,
    modelUsage
  };
}

export type HeatmapData = {
  /** Array of 365 days, each with date string and review count */
  days: Array<{ date: string; count: number }>;
  /** Max count in any single day (for color scaling) */
  maxCount: number;
  /** Total reviews in the past year */
  totalYearReviews: number;
  /** Streak of consecutive days with at least 1 review */
  currentStreak: number;
  longestStreak: number;
};

/**
 * Get heatmap data for the past 365 days — like GitHub's contribution graph.
 */
export async function getReviewHeatmap(userId: string): Promise<HeatmapData> {
  const installationId = await getUserInstallationId(userId);
  if (!installationId) {
    return { days: [], maxCount: 0, totalYearReviews: 0, currentStreak: 0, longestStreak: 0 };
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0);

  const reviews = await prisma.pullRequest.findMany({
    where: {
      installationId,
      status: "reviewed",
      reviewedAt: { gte: oneYearAgo },
    },
    select: { reviewedAt: true },
    orderBy: { reviewedAt: "asc" },
  });

  // Build a map of date → count
  const countByDay = new Map<string, number>();
  for (const r of reviews) {
    if (!r.reviewedAt) continue;
    const day = r.reviewedAt.toISOString().split("T")[0];
    countByDay.set(day, (countByDay.get(day) || 0) + 1);
  }

  // Fill in all 365 days, even those with 0 reviews
  const days: Array<{ date: string; count: number }> = [];
  let maxCount = 0;
  let totalYearReviews = 0;

  const start = new Date(oneYearAgo);
  const today = new Date();

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const count = countByDay.get(dateStr) || 0;
    days.push({ date: dateStr, count });
    if (count > maxCount) maxCount = count;
    totalYearReviews += count;
  }

  // Calculate streaks
  // Current streak: count backwards from today until finding a day with 0 reviews
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  for (const day of days) {
    if (day.count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  return { days, maxCount, totalYearReviews, currentStreak, longestStreak };
}

export type DashboardStats = {
  totalPRs: number;
  reviewedPRs: number;
  pendingPRs: number;
  connectedRepos: number;
  reviewsThisMonth: number;
  remainingFree: number;
};

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const installationId = await getUserInstallationId(userId);
  if (!installationId) {
    return { totalPRs: 0, reviewedPRs: 0, pendingPRs: 0, connectedRepos: 0, reviewsThisMonth: 0, remainingFree: 5 };
  }

  const [totalPRs, reviewedPRs, pendingPRs, connectedRepos] = await Promise.all([
    prisma.pullRequest.count({ where: { installationId } }),
    prisma.pullRequest.count({ where: { installationId, status: "reviewed" } }),
    prisma.pullRequest.count({ where: { installationId, status: "pending" } }),
    prisma.repoSync.count({ where: { installationId } }),
  ]);

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const reviewsThisMonth = await prisma.pullRequest.count({
    where: {
      installationId,
      status: "reviewed",
      reviewedAt: { gte: firstOfMonth },
    },
  });

  return {
    totalPRs,
    reviewedPRs,
    pendingPRs,
    connectedRepos,
    reviewsThisMonth,
    remainingFree: Math.max(0, 5 - reviewsThisMonth),
  };
}
