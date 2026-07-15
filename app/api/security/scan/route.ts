import { NextResponse } from "next/server";
import { getServerSession } from "@/features/auth/actions";
import { getUserInstallationId } from "@/features/github/server/installation";
import { getPullRequestFiles } from "@/features/reviews/server/pr-files";
import { scanPullRequest, saveSecurityFindings } from "@/features/security/server/scan-pr";
import { prisma } from "@/lib/db";

/**
 * POST /api/security/scan
 *
 * Re-runs the security scan (secret detection + heuristic patterns +
 * AI-assisted pass) for an already-reviewed pull request, replacing its
 * previous findings.
 *
 * Body: { pullRequestId: string }
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installationId = await getUserInstallationId(session.user.id);
  if (!installationId) {
    return NextResponse.json({ error: "No GitHub installation found" }, { status: 403 });
  }

  const body = await request.json();
  const { pullRequestId } = body;
  if (!pullRequestId || typeof pullRequestId !== "string") {
    return NextResponse.json({ error: "pullRequestId is required" }, { status: 400 });
  }

  const pullRequest = await prisma.pullRequest.findUnique({
    where: { id: pullRequestId },
  });

  if (!pullRequest || pullRequest.installationId !== installationId) {
    return NextResponse.json({ error: "Pull request not found" }, { status: 404 });
  }

  try {
    const files = await getPullRequestFiles(
      pullRequest.installationId,
      pullRequest.repoFullName,
      pullRequest.prNumber
    );
    const findings = await scanPullRequest(files);
    await saveSecurityFindings(pullRequest.id, findings);

    return NextResponse.json({ findings });
  } catch (error) {
    console.error("[Security Scan API]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 }
    );
  }
}
