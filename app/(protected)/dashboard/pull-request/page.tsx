import type { Metadata } from "next";
import Link from "next/link";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { requireAuth } from "@/features/auth/actions";
import {
  getPRReviewHistory,
  getPRReviewStats,
  getAvailableModels,
} from "@/features/reviews/server/get-pr-history";
import { PRHistoryList } from "@/features/reviews/components/pr-history-list";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pull Requests · Dashboard",
};

export default async function DashboardPullRequestPage() {
  const session = await requireAuth();
  const [prs, stats, models] = await Promise.all([
    getPRReviewHistory(session.user.id),
    getPRReviewStats(session.user.id),
    getAvailableModels(session.user.id),
  ]);

  return (
    <>
      <DashboardHeader
        title="Pull Requests"
        description="Review history and status of AI-reviewed pull requests."
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-6 pt-6">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Reviewed", value: stats.reviewed, color: "text-green-600 dark:text-green-400" },
          { label: "Pending", value: stats.pending, color: "text-amber-600 dark:text-amber-400" },
          { label: "Processing", value: stats.processing, color: "text-blue-600 dark:text-blue-400" },
          { label: "Rate Limited", value: stats.rateLimited, color: "text-red-600 dark:text-red-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border p-4 flex flex-col items-center justify-center text-center"
          >
            <span className="text-2xl font-bold tabular-nums tracking-tight">{stat.value}</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>

      {prs.length > 0 ? (
        <PRHistoryList items={prs} models={models} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <p className="text-sm text-muted-foreground">
            No pull requests reviewed yet. Connect your GitHub App and open a PR to see reviews here.
          </p>
          <Link href={DASHBOARD_ROUTES.github}>
            <Button variant="outline" size="sm">
              Configure GitHub App
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}
