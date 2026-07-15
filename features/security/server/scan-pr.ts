import { prisma } from "@/lib/db";
import type { UserModelPreference } from "@/features/ai";
import type { PrFile } from "@/features/reviews/types/review";
import { SEVERITY_WEIGHT, type SecurityFindingInput, type SecuritySeverity } from "../types";
import { scanForSecrets } from "../rules/secrets";
import { scanForVulnPatterns } from "../rules/patterns";
import { runAiSecurityScan } from "./ai-scan";

function dedupeFindings(findings: SecurityFindingInput[]): SecurityFindingInput[] {
  const seen = new Set<string>();
  const deduped: SecurityFindingInput[] = [];

  for (const finding of findings) {
    const key = `${finding.filePath}::${finding.line ?? "?"}::${finding.category}::${finding.message.slice(0, 40)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(finding);
  }

  return deduped;
}

/**
 * Runs the full security scan pipeline for a PR: deterministic secret/vuln
 * regex rules (always) plus a best-effort AI-assisted pass for subtler issues.
 */
export async function scanPullRequest(
  files: PrFile[],
  modelPreference?: UserModelPreference
): Promise<SecurityFindingInput[]> {
  // Kick off the AI-assisted pass first so its network round-trip overlaps
  // with the synchronous regex scans below, instead of only starting after
  // they finish.
  const aiFindingsPromise = runAiSecurityScan(files, modelPreference);

  const secretFindings = scanForSecrets(files);
  const patternFindings = scanForVulnPatterns(files);
  const aiFindings = await aiFindingsPromise;

  return dedupeFindings([...secretFindings, ...patternFindings, ...aiFindings]);
}

/** Persists scan findings for a pull request, replacing any prior scan results. */
export async function saveSecurityFindings(
  pullRequestId: string,
  findings: SecurityFindingInput[]
) {
  // Run delete+insert atomically — outside a transaction, a failure between
  // the two calls would permanently wipe prior findings for this PR.
  await prisma.$transaction([
    prisma.securityFinding.deleteMany({ where: { pullRequestId } }),
    ...(findings.length > 0
      ? [
          prisma.securityFinding.createMany({
            data: findings.map((finding) => ({
              pullRequestId,
              filePath: finding.filePath,
              line: finding.line,
              severity: finding.severity,
              category: finding.category,
              message: finding.message,
              suggestion: finding.suggestion,
            })),
          }),
        ]
      : []),
  ]);
}

export async function getSecurityFindings(pullRequestId: string) {
  const findings = await prisma.securityFinding.findMany({
    where: { pullRequestId },
    orderBy: { createdAt: "asc" },
  });

  // Sort by severity rank (critical first) since severity is stored as free-form
  // text; fall back to 0 for any unexpected/legacy value so sorting can't produce NaN.
  return findings.sort(
    (a, b) =>
      (SEVERITY_WEIGHT[b.severity as SecuritySeverity] ?? 0) -
      (SEVERITY_WEIGHT[a.severity as SecuritySeverity] ?? 0)
  );
}
