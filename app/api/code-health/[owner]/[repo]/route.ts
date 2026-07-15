import { NextResponse } from "next/server";
import { getServerSession } from "@/features/auth/actions";
import { getUserInstallationId } from "@/features/github/server/installation";
import { getLatestSnapshot, getSnapshotHistory } from "@/features/code-health/server/compute-snapshot";
import { prisma } from "@/lib/db";

/**
 * GET /api/code-health/[owner]/[repo]
 * Returns the latest code health snapshot and recent history for a synced repo.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installationId = await getUserInstallationId(session.user.id);
  if (!installationId) {
    return NextResponse.json({ error: "No GitHub installation found" }, { status: 403 });
  }

  const { owner, repo } = await params;
  const repoFullName = `${owner}/${repo}`;

  const repoSync = await prisma.repoSync.findUnique({ where: { repoFullName } });
  if (!repoSync || repoSync.installationId !== installationId) {
    return NextResponse.json({ error: "Repository not found" }, { status: 404 });
  }

  const [latest, history] = await Promise.all([
    getLatestSnapshot(repoFullName),
    getSnapshotHistory(repoFullName),
  ]);

  return NextResponse.json({
    latest: latest
      ? {
          id: latest.id,
          repoFullName: latest.repoFullName,
          complexityAvg: latest.complexityAvg,
          hotspotCount: latest.hotspotCount,
          hotspots: latest.hotspots ?? [],
          securityDebt: latest.securityDebt,
          testCoverageEst: latest.testCoverageEst,
          filesAnalyzed: latest.filesAnalyzed,
          computedAt: latest.computedAt.toISOString(),
        }
      : null,
    history: history.map((snapshot) => ({
      id: snapshot.id,
      repoFullName: snapshot.repoFullName,
      complexityAvg: snapshot.complexityAvg,
      hotspotCount: snapshot.hotspotCount,
      hotspots: [],
      securityDebt: snapshot.securityDebt,
      testCoverageEst: snapshot.testCoverageEst,
      filesAnalyzed: snapshot.filesAnalyzed,
      computedAt: snapshot.computedAt.toISOString(),
    })),
  });
}
