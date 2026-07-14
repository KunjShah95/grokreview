import { generateWithProvider, getDefaultModel } from "@/features/ai";
import { Octokit } from "octokit";

type CIReviewInput = {
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  headSha: string;
  githubToken: string;
};

type CIReviewResult = {
  status: "reviewed" | "failed" | "no_changes";
  review?: string;
  summary?: string;
  model?: string;
  error?: string;
};

const SYSTEM_PROMPT = `You are an expert code reviewer integrated into a CI pipeline.
Review the provided unified diff and write a concise, actionable pull request review in markdown.

## Review Checklist
Analyze the changes across these dimensions (only mention what's relevant):
- **Correctness** — Bugs, logic errors, off-by-one errors, incorrect assumptions
- **Security** — Injection risks, auth issues, exposed secrets, unsafe deserialization, unvalidated input
- **Performance** — Unnecessary loops, missing indexes, N+1 queries, memory leaks
- **Reliability** — Unhandled errors/edge cases, missing null checks, race conditions
- **Readability** — Naming clarity, overly complex logic, missing comments on non-obvious code
- **Maintainability** — Tight coupling, duplication, violations of SOLID/DRY principles

## Output Format
Start with a **one-line summary** of the overall change quality.
Then use this structure if there are findings:
### ✅ What looks good
### ⚠️ Suggestions
### 🚨 Issues

## CI Context
This review runs as a GitHub Actions CI check. Be concise — the full review
will be posted as a PR comment. Focus on actionable feedback.`;

/**
 * Extract the first non-empty line from the review text as a summary.
 */
function extractSummary(reviewText: string): string {
  const lines = reviewText.split("\n");
  for (const line of lines) {
    const cleaned = line.replace(/^[*#\s]+/, "").trim();
    if (cleaned.length > 0) {
      return cleaned.slice(0, 200);
    }
  }
  return "AI code review completed.";
}

/**
 * Handle a CI-based PR review request from GitHub Actions.
 *
 * The API fetches the PR diff directly using the GITHUB_TOKEN,
 * generates an AI review, posts it as a PR comment, and returns
 * the review text.
 */
export async function handleCIReview(input: CIReviewInput): Promise<CIReviewResult> {
  const { owner, repo, prNumber, title, githubToken } = input;

  // Initialize Octokit with the GITHUB_TOKEN from the Actions workflow
  const octokit = new Octokit({ auth: githubToken });

  // Fetch the PR diff using Octokit
  let diff: string;
  try {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner,
      repo,
      pull_number: prNumber,
      mediaType: { format: "diff" },
    });
    diff = response.data as unknown as string;
  } catch (error) {
    return {
      status: "failed",
      error: `Failed to fetch PR diff: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  if (!diff || diff.trim().length === 0) {
    return {
      status: "no_changes",
      summary: "No code changes detected in this pull request.",
    };
  }

  // Truncate very large diffs to avoid AI token limits
  const truncatedDiff = diff.length > 80000
    ? diff.slice(0, 80000) + "\n\n...(diff truncated due to size)"
    : diff;

  // Select the best available AI model
  const { provider, modelId } = getDefaultModel();

  // Generate the review
  let reviewText: string;
  try {
    reviewText = await generateWithProvider({
      provider,
      modelId,
      system: SYSTEM_PROMPT,
      prompt: `Repository: ${owner}/${repo}
Pull request: #${prNumber} - ${title}
Author: @${input.owner}

Diff:
\`\`\`diff
${truncatedDiff}
\`\`\``,
    });
  } catch (error) {
    console.error("AI review generation failed:", error);
    return {
      status: "failed",
      error: `AI review failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // Post the review as a PR comment
  try {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `## 🤖 GrokReview\n\n**Model:** ${provider}/${modelId}\n\n${reviewText}\n\n---\n*Automated review via GrokReview CI*`,
    });
  } catch (error) {
    console.warn("Failed to post PR comment (GITHUB_TOKEN may lack write permissions):", error);
    // Continue — still return the review even if commenting fails
  }

  // Extract summary from review text
  const summary = extractSummary(reviewText);

  return {
    status: "reviewed",
    review: reviewText,
    summary,
    model: `${provider}/${modelId}`,
  };
}
