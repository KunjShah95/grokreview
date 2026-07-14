import { NextResponse } from "next/server";
import { handleCIReview } from "@/features/reviews/server/ci-review";

/**
 * POST /api/github/ci-review
 *
 * Called by GitHub Actions workflow to trigger an AI PR review.
 * The API fetches the PR diff directly using the GITHUB_TOKEN passed
 * via header — no need to pass large diffs through the workflow.
 *
 * Body:     { owner, repo, prNumber, title, headSha }
 * Headers:  Authorization: Bearer <PR_REVIEWER_API_KEY>
 *           X-GitHub-Token: <GITHUB_TOKEN>
 *
 * SECURITY: PR_REVIEWER_API_KEY MUST be set on the deployment.
 *           Without it, the endpoint will refuse all requests.
 */
export async function POST(request: Request) {
  try {
    // PR_REVIEWER_API_KEY is REQUIRED — no fallback
    const apiKey = process.env.PR_REVIEWER_API_KEY;
    if (!apiKey) {
      console.error(
        "PR_REVIEWER_API_KEY is not set. Set it in your deployment environment."
      );
      return NextResponse.json(
        {
          error:
            "Server misconfigured: PR_REVIEWER_API_KEY is not set. " +
            "Set this environment variable on your deployment.",
        },
        { status: 500 }
      );
    }

    // Validate API key from request
    const authHeader = request.headers.get("authorization");
    const requestKey = authHeader?.replace("Bearer ", "");

    if (!requestKey || requestKey !== apiKey) {
      return NextResponse.json(
        { error: "Invalid or missing API key." },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const { owner, repo, prNumber, title, headSha } = body;

    if (!owner || !repo || !prNumber || !title || !headSha) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: owner, repo, prNumber, title, headSha",
        },
        { status: 400 }
      );
    }

    if (typeof prNumber !== "number" || prNumber < 1) {
      return NextResponse.json(
        { error: "prNumber must be a positive integer" },
        { status: 400 }
      );
    }

    // GITHUB_TOKEN from the workflow — used to fetch the diff
    const githubToken = request.headers.get("x-github-token");
    if (!githubToken) {
      return NextResponse.json(
        { error: "Missing X-GitHub-Token header. This is provided automatically by GitHub Actions." },
        { status: 400 }
      );
    }

    // Run the CI review
    const result = await handleCIReview({
      owner,
      repo,
      prNumber,
      title,
      headSha,
      githubToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("CI review error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        status: "failed",
      },
      { status: 500 }
    );
  }
}
