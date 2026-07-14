import { getGithubApp } from "@/features/github/utils/github-app";

/**
 * Submit a formal PR review via the GitHub Reviews API.
 *
 * This replaces a plain issue comment with a full review that appears in
 * the PR's "Files changed" tab and the "Reviews" timeline section.
 *
 * The `event` parameter controls the review type:
 *   - "COMMENT"         — Provide feedback without explicitly approving or blocking
 *   - "APPROVE"         — Approve the PR
 *   - "REQUEST_CHANGES" — Request changes before merging
 *
 * For AI reviews we use "COMMENT" so the review appears as formal feedback
 * without blocking the merge or auto-approving.
 */
export async function submitFormalReview(
  installationId: number,
  repoFullName: string,
  prNumber: number,
  body: string,
  event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES" = "COMMENT"
) {
  const app = getGithubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const parts = repoFullName.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid repository name: ${repoFullName} — expected owner/repo format`);
  }
  const [owner, repo] = parts;

  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
    {
      owner,
      repo,
      pull_number: prNumber,
      body,
      event,
      headers: {
        accept: "application/vnd.github.v3+json",
      },
    }
  );

  return data;
}
