import { PullRequestWebhookPayload } from "@/features/github/server/webhook-handler";
import { prisma } from "@/lib/db";

function getAuthorLogin(
  user: { login: string } | null
): string | null {
  if (!user) {
    return null;
  }
  return user.login;
}

/**
 * Save or update a pull request record from a webhook payload.
 */
export async function savePullRequest(payload: PullRequestWebhookPayload) {
  const repoFullName = payload.repository.full_name;
  const prNumber = payload.pull_request.number;

  return prisma.pullRequest.upsert({
    where: {
      repoFullName_prNumber: { repoFullName, prNumber }
    },
    create: {
      installationId: payload.installation.id,
      repoFullName,
      prNumber,
      title: payload.pull_request.title,
      authorLogin: getAuthorLogin(payload.pull_request.user),
      headSha: payload.pull_request.head.sha,
      baseBranch: payload.pull_request.base.ref,
      status: "pending",
    },
    update: {
      title: payload.pull_request.title,
      headSha: payload.pull_request.head.sha,
      // Only reset to "pending" if it's not already processing/reviewed
      status: "pending",
    }
  });
}

/**
 * Review caching: Check if a PR's head SHA has changed since last review.
 * If the SHA is the same, the PR hasn't changed — skip re-review.
 */
export async function hasPRChanged(
  repoFullName: string,
  prNumber: number,
  newHeadSha: string
): Promise<boolean> {
  const existing = await prisma.pullRequest.findUnique({
    where: {
      repoFullName_prNumber: { repoFullName, prNumber }
    },
    select: { headSha: true, status: true },
  });

  // New PR — definitely changed
  if (!existing) {
    return true;
  }

  // Same SHA and already reviewed — skip
  if (existing.headSha === newHeadSha && existing.status === "reviewed") {
    return false;
  }

  // Same SHA and still processing — skip
  if (existing.headSha === newHeadSha && existing.status === "processing") {
    return false;
  }

  // SHA changed or PR is pending — needs review
  return true;
}
