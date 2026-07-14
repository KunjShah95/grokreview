import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { requireAuth } from "@/features/auth/actions";
import { getReviewAnalytics, getReviewHeatmap } from "@/features/analytics/server/stats";
import { getMonthlyLeaderboard } from "@/features/analytics/server/leaderboard";
import { ReviewCharts, StatCard } from "@/features/analytics/components/review-charts";
import { ReviewHeatmap } from "@/features/analytics/components/review-heatmap";
import { Leaderboard } from "@/features/analytics/components/leaderboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics · Dashboard",
};

export default async function DashboardAnalyticsPage() {
  const session = await requireAuth();
  const [analytics, heatmap, leaderboard] = await Promise.all([
    getReviewAnalytics(session.user.id),
    getReviewHeatmap(session.user.id),
    getMonthlyLeaderboard(session.user.id),
  ]);

  return (
    <>
      <DashboardHeader
        title="Analytics"
        description="Review statistics and usage insights for your GitHub repositories."
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pt-6">
        <StatCard
          label="Total Reviews"
          value={analytics.totalReviews}
          description="All-time"
        />
        <StatCard
          label="This Month"
          value={analytics.reviewsThisMonth}
          description="Reviews in current month"
          color="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          label="Avg Review Time"
          value={
            analytics.averageReviewTime !== null
              ? `${analytics.averageReviewTime}m`
              : "—"
          }
          description="From PR open to review"
        />
        <StatCard
          label="Top Repos"
          value={analytics.topRepositories.length}
          description="Active repositories"
        />
      </div>

      {/* GitHub-style Contribution Heatmap */}
      <div className="px-6 pt-6">
        <ReviewHeatmap data={heatmap} />
      </div>

      {/* Monthly Leaderboard */}
      <div className="px-6 pt-6">
        <Leaderboard data={leaderboard} />
      </div>

      {/* Charts */}
      <div className="p-6">
        <ReviewCharts analytics={analytics} />
      </div>
    </>
  );
}
