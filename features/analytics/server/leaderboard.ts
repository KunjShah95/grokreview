import { prisma } from "@/lib/db";
import { getUserInstallationId } from "@/features/github/server/installation";
import { startOfMonth, subMonths, format } from "date-fns";

export type LeaderboardEntry = {
  rank: number;
  authorLogin: string;
  displayName: string;
  /** Number of PRs authored this month */
  prsAuthored: number;
  /** Number of reviews completed */
  reviews: number;
  /** Average review time in minutes (if available) */
  avgReviewTime: number | null;
  /** Trend compared to last month: "up" | "down" | "new" | "same" */
  trend: "up" | "down" | "new" | "same";
  /** Percentage change from last month */
  trendPercent: number;
  /** Top repository they contribute to */
  topRepo: string | null;
};

export type LeaderboardData = {
  month: string;
  entries: LeaderboardEntry[];
  totalReviews: number;
  totalContributors: number;
};

/**
 * Get the monthly review leaderboard grouped by PR author.
 * Shows who reviewed the most PRs this month.
 */
export async function getMonthlyLeaderboard(userId: string): Promise<LeaderboardData> {
  const installationId = await getUserInstallationId(userId);
  if (!installationId) {
    return { month: format(new Date(), "MMMM yyyy"), entries: [], totalReviews: 0, totalContributors: 0 };
  }

  // Current month range
  const thisMonthStart = startOfMonth(new Date());
  const nextMonthStart = startOfMonth(subMonths(thisMonthStart, -1));

  // Last month range
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));

  // Get this month's reviews grouped by author
  const thisMonthAuthors = await prisma.pullRequest.groupBy({
    by: ["authorLogin"],
    where: {
      installationId,
      status: "reviewed",
      reviewedAt: { gte: thisMonthStart, lt: nextMonthStart },
      authorLogin: { not: null },
    },
    _count: { authorLogin: true },
    orderBy: { _count: { authorLogin: "desc" } },
    take: 20,
  });

  // Get last month's counts for trend comparison
  const lastMonthAuthors = await prisma.pullRequest.groupBy({
    by: ["authorLogin"],
    where: {
      installationId,
      status: "reviewed",
      reviewedAt: { gte: lastMonthStart, lt: thisMonthStart },
      authorLogin: { not: null },
    },
    _count: { authorLogin: true },
  });

  const lastMonthMap = new Map(
    lastMonthAuthors.map((a) => [a.authorLogin, a._count.authorLogin])
  );

  // Build entries
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < thisMonthAuthors.length; i++) {
    const author = thisMonthAuthors[i];
    const login = author.authorLogin as string;
    const count = author._count.authorLogin;
    const lastMonthCount = lastMonthMap.get(login) || 0;

    // Determine trend
    let trend: "up" | "down" | "new" | "same";
    let trendPercent = 0;

    if (lastMonthCount === 0) {
      trend = "new";
      trendPercent = 100;
    } else if (count > lastMonthCount) {
      trend = "up";
      trendPercent = Math.round(((count - lastMonthCount) / lastMonthCount) * 100);
    } else if (count < lastMonthCount) {
      trend = "down";
      trendPercent = Math.round(((lastMonthCount - count) / lastMonthCount) * 100);
    } else {
      trend = "same";
      trendPercent = 0;
    }

    // Get their top repo
    const topRepo = await getTopRepoForAuthor(installationId, login);
    // Get avg review time
    const avgTime = await getAvgReviewTimeForAuthor(installationId, login, thisMonthStart, nextMonthStart);

    entries.push({
      rank: i + 1,
      authorLogin: login,
      displayName: login, // Will be enhanced if we have user display names
      prsAuthored: count,
      reviews: count,
      avgReviewTime: avgTime,
      trend,
      trendPercent,
      topRepo,
    });
  }

  const totalReviews = entries.reduce((sum, e) => sum + e.reviews, 0);

  return {
    month: format(new Date(), "MMMM yyyy"),
    entries,
    totalReviews,
    totalContributors: entries.length,
  };
}

/**
 * Get the top repository for a given author in this installation.
 */
async function getTopRepoForAuthor(
  installationId: number,
  authorLogin: string
): Promise<string | null> {
  const repos = await prisma.pullRequest.groupBy({
    by: ["repoFullName"],
    where: {
      installationId,
      authorLogin,
      status: "reviewed",
    },
    _count: { repoFullName: true },
    orderBy: { _count: { repoFullName: "desc" } },
    take: 1,
  });
  return repos[0]?.repoFullName || null;
}

/**
 * Get the average review time (in minutes) for a given author this month.
 */
async function getAvgReviewTimeForAuthor(
  installationId: number,
  authorLogin: string,
  from: Date,
  to: Date
): Promise<number | null> {
  const reviews = await prisma.pullRequest.findMany({
    where: {
      installationId,
      authorLogin,
      status: "reviewed",
      reviewedAt: { gte: from, lt: to },
      createdAt: { not: undefined },
    },
    select: { createdAt: true, reviewedAt: true },
    take: 50,
  });

  let totalMinutes = 0;
  let count = 0;
  for (const r of reviews) {
    if (!r.reviewedAt) continue;
    const diffMs = r.reviewedAt.getTime() - r.createdAt.getTime();
    if (diffMs > 0) {
      totalMinutes += diffMs / 60000;
      count++;
    }
  }

  return count > 0 ? Math.round(totalMinutes / count) : null;
}
