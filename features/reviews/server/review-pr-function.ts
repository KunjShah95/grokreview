import { inngest } from "@/features/inngest/client";
import { prisma } from "@/lib/db";
import { getPullRequestFiles } from "./pr-files";
import { generateReview } from "./generate-review";
import { submitFormalReview } from "./submit-formal-review";
import { postPrComment } from "./post-pr-comment";
import { chunkPrFiles } from "../utils/chunk-code";
import { buildPrNamespace, saveChunksToPinecone, searchPrContext } from "./vector";
import { buildRepoNamespace } from "@/features/repo-sync/server/repo-sync";
import { getUserIdByInstallationId } from "@/features/github/server/installation";
import { scanPullRequest, saveSecurityFindings } from "@/features/security/server/scan-pr";
import { formatFindingsForReview, hasLeakedSecret } from "@/features/security/format-findings";
import { generateTestsForPr } from "@/features/test-gen/server/generate-tests";
import { saveGeneratedTests } from "@/features/test-gen/server/save-tests";

export const reviewPullRequest = inngest.createFunction(
  { id: "review-pull-request", triggers: { event: "github/pr.received" } },
  async ({ event, step }) => {
    const pullRequestId = event.data.pullRequestId;

    const pullRequest = await step.run("mark-processing", async () => {
      return prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: { status: "processing" },
      });
    });

    const files = await step.run("fetch-pr-files", async () => {
      return getPullRequestFiles(
        pullRequest.installationId,
        pullRequest.repoFullName,
        pullRequest.prNumber
      );
    });

    const chunks = await step.run("breakdown-code", async () => {
      // Turn unified diffs into fixed-size chunks for embedding
      return chunkPrFiles(pullRequest.prNumber, files);
    });

    if (chunks.length === 0) {
      await step.run("mark-reviewed-no-code", async () => {
        await prisma.pullRequest.update({
          where: { id: pullRequestId },
          data: { status: "reviewed" },
        });
      });
      return { pullRequestId, status: "reviewed", reason: "no code to review" };
    }

    // Security scan and test generation only run once we know there's
    // actual code to review — otherwise these AI calls (and their DB rows)
    // would be wasted work for a PR that gets no formal review at all
    // (submit-formal-review below never runs on the no-code early return).
    // The two are independent (both just read `files`), so run them concurrently.
    const [securityFindings] = await Promise.all([
      step.run("scan-security", async () => {
        const findings = await scanPullRequest(files);
        await saveSecurityFindings(pullRequestId, findings);
        return findings;
      }),
      step.run("generate-tests", async () => {
        const tests = await generateTestsForPr(files);
        await saveGeneratedTests(pullRequestId, tests);
      }),
    ]);

    // PR namespace isolates this diff from other PRs and from repo-wide sync data
    const namespace = buildPrNamespace(
      pullRequest.repoFullName,
      pullRequest.prNumber
    );

    await step.run("save-vectors-to-pinecone", async () => {
      await saveChunksToPinecone(namespace, chunks);
    });

    // Pinecone needs a short delay before new vectors appear in search results
    await step.sleep("wait-for-vectors-to-index", "10s");

    // Extra context from the on-demand codebase sync, when the repo was
    // synced, and this PR's own diff context — two independent Pinecone
    // searches against different namespaces, run concurrently.
    const [repoContextSnippets, contextSnippets] = await Promise.all([
      step.run("search-repo-context", async () => {
        const repoSync = await prisma.repoSync.findUnique({
          where: { repoFullName: pullRequest.repoFullName },
        });
        if (!repoSync || repoSync.status !== "synced") {
          return [];
        }
        const repoNamespace = buildRepoNamespace(pullRequest.repoFullName);
        return searchPrContext(repoNamespace, pullRequest.title);
      }),
      step.run("search-pr-context", async () => {
        return searchPrContext(namespace, pullRequest.title);
      }),
    ]);

    const review = await step.run("generate-ai-review", async () => {
      return generateReview({
        repoFullName: pullRequest.repoFullName,
        title: pullRequest.title,
        contextSnippets,
        repoContextSnippets,
      });
    });

    // Find the user for usage alert tracking
    const userId = await step.run("find-user", async () => {
      return getUserIdByInstallationId(pullRequest.installationId);
    });

    // review now contains { text, model }
    await step.run("submit-formal-review", async () => {
      if (!review) {
        throw new Error("No review content was generated.");
      }
      const securitySection = formatFindingsForReview(securityFindings);
      const reviewBody = `## 🤖 GrokReview\n\n**Model:** ${review.model}\n\n${review.text}${securitySection}`;

      // Escalate to REQUEST_CHANGES only for leaked secrets — the one
      // security category with near-zero false positives. Heuristic
      // vulnerability patterns (SQLi/XSS/SSRF) stay COMMENT-only since
      // they can misfire and shouldn't silently block a merge.
      const event = hasLeakedSecret(securityFindings) ? "REQUEST_CHANGES" : "COMMENT";

      try {
        await submitFormalReview(
          pullRequest.installationId,
          pullRequest.repoFullName,
          pullRequest.prNumber,
          reviewBody,
          event
        );
      } catch (error) {
        console.warn(
          "[Review] Formal review API failed, falling back to comment:",
          (error as Error).message
        );
        await postPrComment(
          pullRequest.installationId,
          pullRequest.repoFullName,
          pullRequest.prNumber,
          reviewBody
        );
      }
    });

    await step.run("mark-reviewed", async () => {
      await prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: {
          status: "reviewed",
          model: review.model,
          reviewComment: review.text,
          reviewedAt: new Date(),
        },
      });
    });

    // Trigger usage alert check in the background
    if (userId) {
      await inngest.send({
        name: "usage/alert.check",
        data: { userId },
      });
    }

    return { pullRequestId, status: "reviewed" };
  }
);
