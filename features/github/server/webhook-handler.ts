import { inngest } from "@/features/inngest/client";
import { savePullRequest, hasPRChanged } from "@/features/reviews/server/save-pull-request";
import { getGithubApp } from "../utils/github-app";
import { getUserIdByInstallationId } from "./installation";
import { canUserReview } from "@/features/billing/server/usage";
import { prisma } from "@/lib/db";
import { logWebhookEvent } from "@/features/webhooks/server/log";

const REVIEWABLE_ACTIONS = ["opened", "synchronize", "reopened"];

export type PullRequestWebhookPayload = {
  /** Webhook action, e.g. `opened`, `synchronize`, `reopened` */
  action: string;
  /** GitHub App installation that received the event */
  installation: { id: number };
  repository: { full_name: string };
  pull_request: {
    number: number;
    title: string;
    user: { login: string } | null;
    head: { sha: string };
    base: { ref: string };
  };
};

async function isSignatureValid(payload: string, signature: string | null) {
  if (!signature) {
    return false;
  }
  const app = getGithubApp();
  return app.webhooks.verify(payload, signature);
}

export async function handleGithubWebhook(request: Request) {
  const startTime = Date.now();
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const eventName = request.headers.get("x-github-event") || "unknown";

  // Validate signature
  const isValid = await isSignatureValid(payload, signature);
  if (!isValid) {
    logWebhookEvent({
      eventName,
      action: null,
      repoFullName: null,
      status: "failed",
      statusCode: 401,
      durationMs: Date.now() - startTime,
      payload,
      error: "Invalid signature",
    });
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse event for non-pull_request events
  if (eventName !== "pull_request") {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const repoFullName = (parsed.repository as Record<string, unknown> | undefined)?.full_name as string | null;

    logWebhookEvent({
      eventName,
      action: null,
      repoFullName,
      status: "received",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      payload,
      error: null,
    });

    return Response.json({ received: true });
  }

  const event = JSON.parse(payload) as PullRequestWebhookPayload;
  const repoFullName = event.repository.full_name;

  // Webhook event log for non-reviewable actions
  if (!REVIEWABLE_ACTIONS.includes(event.action)) {
    logWebhookEvent({
      eventName,
      action: event.action,
      repoFullName,
      status: "received",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      payload,
      error: null,
    });
    return Response.json({ received: true });
  }

  // Review caching: check if the PR has actually changed
  const prChanged = await hasPRChanged(
    repoFullName,
    event.pull_request.number,
    event.pull_request.head.sha
  );

  if (!prChanged) {
    // No changes — skip re-review but log it
    logWebhookEvent({
      eventName,
      action: event.action,
      repoFullName,
      status: "received",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      payload,
      error: null,
    });

    return Response.json({ received: true, cached: true });
  }

  const pullRequest = await savePullRequest(event);
  const userId = await getUserIdByInstallationId(event.installation.id);

  // Check usage limits
  if (userId) {
    const allowed = await canUserReview(userId);
    if (!allowed) {
      await prisma.pullRequest.update({
        where: { id: pullRequest.id },
        data: { status: "rate_limited" }
      });

      logWebhookEvent({
        eventName,
        action: event.action,
        repoFullName,
        status: "failed",
        statusCode: 429,
        durationMs: Date.now() - startTime,
        payload,
        error: "Rate limited — user exceeded free monthly limit",
      });

      return Response.json({ received: true, rateLimited: true });
    }
  }

  // Log processed webhook
  logWebhookEvent({
    eventName,
    action: event.action,
    repoFullName,
    status: "processed",
    statusCode: 200,
    durationMs: Date.now() - startTime,
    payload: JSON.stringify({ /* truncated for log */ }),
    error: null,
  });

  // Send to Inngest for background processing
  await inngest.send({
    name: "github/pr.received",
    data: { pullRequestId: pullRequest.id },
  });

  return Response.json({ received: true });
}
