import type { Metadata } from "next";
import Link from "next/link";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DASHBOARD_ROUTES } from "@/features/dashboard/lib/routes";
import { requireAuth } from "@/features/auth/actions";
import { getUserInstallationId } from "@/features/github/server/installation";
import { getSyncedRepos } from "@/features/repo-sync/server/repo-sync";
import { getLatestSnapshot, getSnapshotHistory } from "@/features/code-health/server/compute-snapshot";
import { CodeHealthRepoPicker } from "@/features/code-health/components/code-health-repo-picker";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Code Health · Dashboard",
};

export default async function DashboardCodeHealthPage() {
  const session = await requireAuth();
  const installationId = await getUserInstallationId(session.user.id);
  const repos = installationId ? await getSyncedRepos(installationId) : [];

  const header = (
    <DashboardHeader
      title="Code Health"
      description="Complexity trends, hotspot files, and open security debt for your synced repositories."
    />
  );

  if (repos.length === 0) {
    return (
      <>
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <p className="text-sm text-muted-foreground text-center max-w-md">
            No synced repositories yet. Sync a repo from the Repositories page to compute its first
            code health snapshot.
          </p>
          <Link href={DASHBOARD_ROUTES.repos}>
            <Button variant="outline" size="sm">
              Go to Repositories
            </Button>
          </Link>
        </div>
      </>
    );
  }

  const initialRepo = repos[0].repoFullName;
  const [latest, history] = await Promise.all([
    getLatestSnapshot(initialRepo),
    getSnapshotHistory(initialRepo),
  ]);

  const serializeSnapshot = (
    snapshot: Awaited<ReturnType<typeof getLatestSnapshot>>
  ) =>
    snapshot
      ? {
          id: snapshot.id,
          repoFullName: snapshot.repoFullName,
          complexityAvg: snapshot.complexityAvg,
          hotspotCount: snapshot.hotspotCount,
          hotspots: (snapshot.hotspots as unknown as { filePath: string; complexity: number; lines: number }[]) ?? [],
          securityDebt: snapshot.securityDebt,
          testCoverageEst: snapshot.testCoverageEst,
          filesAnalyzed: snapshot.filesAnalyzed,
          computedAt: snapshot.computedAt.toISOString(),
        }
      : null;

  return (
    <>
      {header}
      <CodeHealthRepoPicker
        repos={repos.map((r) => ({ repoFullName: r.repoFullName }))}
        initialRepo={initialRepo}
        initialLatest={serializeSnapshot(latest)}
        initialHistory={history.map((s) => serializeSnapshot(s)!).filter(Boolean)}
      />
    </>
  );
}
