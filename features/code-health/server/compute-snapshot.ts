import { prisma } from "@/lib/db";
import type { RepoFile } from "@/features/repo-sync/types";
import { computeComplexitySummary } from "./analyze-complexity";

/** Computes and persists a code health snapshot for a repo from its synced files. */
export async function computeAndSaveSnapshot(repoFullName: string, files: RepoFile[]) {
  const summary = computeComplexitySummary(files);

  const securityDebt = await prisma.securityFinding.count({
    where: {
      resolved: false,
      pullRequest: { repoFullName },
    },
  });

  await prisma.codeHealthSnapshot.create({
    data: {
      repoFullName,
      complexityAvg: summary.complexityAvg,
      hotspotCount: summary.hotspotCount,
      hotspots: summary.hotspots,
      securityDebt,
      testCoverageEst: summary.testCoverageEst,
      filesAnalyzed: summary.filesAnalyzed,
    },
  });

  return summary;
}

export async function getLatestSnapshot(repoFullName: string) {
  return prisma.codeHealthSnapshot.findFirst({
    where: { repoFullName },
    orderBy: { computedAt: "desc" },
  });
}

export async function getSnapshotHistory(repoFullName: string, limit = 30) {
  const snapshots = await prisma.codeHealthSnapshot.findMany({
    where: { repoFullName },
    orderBy: { computedAt: "desc" },
    take: limit,
  });
  return snapshots.reverse();
}
