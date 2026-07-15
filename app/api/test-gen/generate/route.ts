import { NextResponse } from "next/server";
import { getServerSession } from "@/features/auth/actions";
import { getUserInstallationId } from "@/features/github/server/installation";
import { getPullRequestFiles } from "@/features/reviews/server/pr-files";
import { generateTestsForPr } from "@/features/test-gen/server/generate-tests";
import { saveGeneratedTests } from "@/features/test-gen/server/save-tests";
import { canUserReview } from "@/features/billing/server/usage";
import { prisma } from "@/lib/db";

/**
 * POST /api/test-gen/generate
 *
 * Re-generates unit tests for an already-reviewed pull request's changed
 * files, replacing any previously generated tests.
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

  if (!(await canUserReview(session.user.id))) {
    return NextResponse.json(
      { error: "Free plan limit reached. Upgrade to Pro for unlimited AI actions, including test generation." },
      { status: 429 }
    );
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
    const tests = await generateTestsForPr(files);
    await saveGeneratedTests(pullRequest.id, tests);

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("[Test Gen API]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test generation failed" },
      { status: 500 }
    );
  }
}
