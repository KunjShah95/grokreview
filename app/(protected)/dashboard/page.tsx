import { requireAuth } from "@/features/auth/actions";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { getDashboardStats } from "@/features/analytics/server/stats";
import type { Metadata } from "next";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  title: "Dashboard · Overview",
};

const Dashboard = async () => {
  const session = await requireAuth();
  const user = session.user as { id: string; name: string; email: string; image?: string | null; plan?: string };
  const stats = await getDashboardStats(user.id);

  return (
    <>
      <DashboardHeader
        title="Overview"
        description="Welcome back! Here's your review activity at a glance."
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-none border border-border p-6">
            <p className="text-xs text-muted-foreground">Total Reviews</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{stats.totalPRs}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Across all repos</p>
          </div>
          <div className="rounded-none border border-border p-6">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
              {stats.reviewsThisMonth}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {stats.remainingFree > 0
                ? `${stats.remainingFree} free reviews left`
                : "On unlimited plan"}
            </p>
          </div>
          <div className="rounded-none border border-border p-6">
            <p className="text-xs text-muted-foreground">Connected Repos</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{stats.connectedRepos}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Active synced repos</p>
          </div>
          <div className="rounded-none border border-border p-6">
            <p className="text-xs text-muted-foreground">Plan</p>
            <p className="mt-1 text-3xl font-bold capitalize">
              {user.plan ?? "Free"}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              <Link href="/dashboard/settings" className="underline underline-offset-2 hover:text-foreground">
                Manage →
              </Link>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href="/dashboard/pull-request"
            className="group rounded-none border border-border p-6 hover:border-purple-500/30 transition-colors"
          >
            <h3 className="text-sm font-medium group-hover:text-purple-400 transition-colors">
              PR History →
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              View all reviewed pull requests and review details.
            </p>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="group rounded-none border border-border p-6 hover:border-purple-500/30 transition-colors"
          >
            <h3 className="text-sm font-medium group-hover:text-purple-400 transition-colors">
              Analytics →
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Review statistics, trends, and insights.
            </p>
          </Link>
          <Link
            href="/dashboard/github"
            className="group rounded-none border border-border p-6 hover:border-purple-500/30 transition-colors"
          >
            <h3 className="text-sm font-medium group-hover:text-purple-400 transition-colors">
              GitHub App →
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage your GitHub App installation and permissions.
            </p>
          </Link>
        </div>

        {/* Empty State */}
        {stats.totalPRs === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-none border border-dashed border-border p-12">
            <div className="text-center max-w-sm">
              <p className="text-sm text-muted-foreground mb-1">
                No pull requests reviewed yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Install the GitHub App and open a PR on any connected repository.
                The review will appear here automatically.
              </p>
              <Link
                href="/dashboard/github"
                className="inline-block mt-4 text-xs font-medium text-purple-500 hover:text-purple-400 underline underline-offset-2"
              >
                Install GitHub App →
              </Link>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {stats.totalPRs > 0 && (
          <div className="rounded-none border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Quick Links</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Link
                href="/dashboard/pull-request"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="size-1.5 rounded-full bg-green-500" />
                {stats.reviewedPRs} Reviewed
              </Link>
              <Link
                href="/dashboard/pull-request?status=pending"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="size-1.5 rounded-full bg-amber-500" />
                {stats.pendingPRs} Pending
              </Link>
              <Link
                href="/dashboard/webhooks"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="size-1.5 rounded-full bg-blue-500" />
                Webhook Log
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="size-1.5 rounded-full bg-purple-500" />
                Settings
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
