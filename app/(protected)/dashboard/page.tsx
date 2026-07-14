import { requireAuth } from "@/features/auth/actions";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { getDashboardStats } from "@/features/analytics/server/stats";
import type { Metadata } from "next";
import Link from "next/link";
import {
  GitPullRequest,
  CalendarBlank,
  Stack,
  CreditCard,
  ArrowRight,
  Cpu,
} from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Dashboard · Overview",
};

const Dashboard = async () => {
  const session = await requireAuth();
  const user = session.user as { id: string; name: string; email: string; image?: string | null; plan?: string };
  const stats = await getDashboardStats(user.id);

  const topPct =
    stats.topModel && stats.reviewedPRs > 0
      ? Math.round((stats.topModel.count / stats.reviewedPRs) * 100)
      : 0;

  const kpis = [
    {
      label: "Total reviews",
      value: stats.totalPRs,
      hint: "Across all repositories",
      icon: GitPullRequest,
      accent: false,
    },
    {
      label: "This month",
      value: stats.reviewsThisMonth,
      hint:
        stats.remainingFree > 0
          ? `${stats.remainingFree} free reviews left`
          : "On unlimited plan",
      icon: CalendarBlank,
      accent: true,
    },
    {
      label: "Connected repos",
      value: stats.connectedRepos,
      hint: "Actively synced",
      icon: Stack,
      accent: false,
    },
    {
      label: "Plan",
      value: user.plan ?? "Free",
      hint: "Manage billing",
      href: "/dashboard/settings",
      icon: CreditCard,
      accent: false,
    },
  ];

  const actions = [
    { href: "/dashboard/pull-request", title: "PR history", body: "Every reviewed pull request and its findings." },
    { href: "/dashboard/analytics", title: "Analytics", body: "Review trends, model usage, and insights." },
    { href: "/dashboard/github", title: "GitHub App", body: "Manage installation, repos, and permissions." },
  ];

  return (
    <>
      <DashboardHeader
        title="Overview"
        description="Your review activity at a glance."
      />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => {
            const Inner = (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  <kpi.icon
                    className={`size-4 ${kpi.accent ? "text-primary" : "text-muted-foreground"}`}
                    weight="bold"
                  />
                </div>
                <p
                  className={`mt-3 text-3xl font-semibold tabular-nums tracking-tight capitalize ${
                    kpi.accent ? "text-primary" : "text-foreground"
                  }`}
                >
                  {kpi.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{kpi.hint}</p>
              </>
            );
            return kpi.href ? (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                {Inner}
              </Link>
            ) : (
              <div key={kpi.label} className="rounded-xl border border-border bg-card p-5">
                {Inner}
              </div>
            );
          })}
        </div>

        {/* Most used model */}
        {stats.topModel && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-primary">
                  <Cpu className="size-4" weight="bold" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">Most used model</p>
                  <p className="font-mono text-sm font-medium">{stats.topModel.model}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums">{stats.topModel.count}</p>
                <p className="text-[10px] text-muted-foreground">of {stats.reviewedPRs} reviews</p>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${topPct}%` }} />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {topPct > 0 ? `${topPct}% of all reviews` : "No reviews yet"}
            </p>
          </div>
        )}

        {/* Empty state */}
        {stats.totalPRs === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border p-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
              <GitPullRequest className="size-5" weight="bold" />
            </span>
            <p className="mt-4 text-sm font-medium">No pull requests reviewed yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Install the GitHub App and open a PR on any connected repository. The
              review appears here automatically.
            </p>
            <Link
              href="/dashboard/github"
              className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-transform active:translate-y-px"
            >
              Install GitHub App
              <ArrowRight className="size-3.5" weight="bold" />
            </Link>
          </div>
        ) : (
          /* Quick actions */
          <div className="grid gap-3 md:grid-cols-3">
            {actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">{a.title}</h3>
                  <ArrowRight className="size-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" weight="bold" />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.body}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
