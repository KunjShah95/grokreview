import { inngest } from "@/features/inngest/client";
import {
  savePullRequest,
  hasPRChanged,
} from "@/features/reviews/server/save-pull-request";
import { getGithubApp } from "../utils/github-app";
import {
  getUserIdByInstallationId,
  deleteInstallation,
} from "./installation";
import { canUserReview } from "@/features/billing/server/usage";
import { prisma } from "@/lib/db";
import { logWebhookEvent } from "@/features/webhooks/server/log";

const REVIEWABLE_ACTIONS = ["opened", "synchronize", "reopened", "ready_for_review"];

export type PullRequestWebhookPayload = {
  action: string;
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
  try {
    const app = getGithubApp();
    return app.webhooks.verify(payload, signature);
  } catch {
    return false;
  }
}

type WebhookLogInput = {
  eventName: string;
  action: string | null;
  repoFullName: string | null;
  status: "received" | "processed" | "failed";
  statusCode: number;
  durationMs: number;
  error: string | null;
};

function logEvent(input: WebhookLogInput) {
  logWebhookEvent({
    ...input,
    payload: input.error
      ? JSON.stringify({ error: input.error })
      : JSON.stringify({}),
  });
}

export async function handleGithubWebhook(request: Request) {
  const startTime = Date.now();

  let payload: string;
  try {
    payload = await request.text();
  } catch {
    return Response.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  const signature = request.headers.get("x-hub-signature-256");
  const eventName = request.headers.get("x-github-event") || "unknown";

  const isValid = await isSignatureValid(payload, signature);
  if (!isValid) {
    logEvent({
      eventName,
      action: null,
      repoFullName: null,
      status: "failed",
      statusCode: 401,
      durationMs: Date.now() - startTime,
      error: "Invalid signature",
    });
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Handle installation events (install, uninstall)
  if (eventName === "installation") {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const installationData = parsed.installation as
      | { id: number }
      | undefined;
    const action = parsed.action as string | undefined;

    if (action === "deleted" && installationData?.id) {
      const userId = await getUserIdByInstallationId(installationData.id);
      if (userId) {
        await deleteInstallation(userId);
      }
    }

    logEvent({
      eventName,
      action: action || null,
      repoFullName: null,
      status: "received",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      error: null,
    });

    return Response.json({ received: true });
  }

  // Skip non-pull_request events
  if (eventName !== "pull_request") {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const repoFullName = (
      parsed.repository as Record<string, unknown> | undefined
    )?.full_name as string | null;

    logEvent({
      eventName,
      action: null,
      repoFullName,
      status: "received",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      error: null,
    });

    return Response.json({ received: true });
  }

  // Parse pull_request event
  let event: PullRequestWebhookPayload;
  try {
    event = JSON.parse(payload) as PullRequestWebhookPayload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoFullName = event.repository.full_name;

  if (!REVIEWABLE_ACTIONS.includes(event.action)) {
    logEvent({
      eventName,
      action: event.action,
      repoFullName,
      status: "received",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      error: null,
    });
    return Response.json({ received: true });
  }

  // Review caching: check if the PR has actually changed
  let prChanged: boolean;
  try {
    prChanged = await hasPRChanged(
      repoFullName,
      event.pull_request.number,
      event.pull_request.head.sha
    );
  } catch {
    return Response.json(
      { error: "Failed to check PR state" },
      { status: 500 }
    );
  }

  if (!prChanged) {
    logEvent({
      eventName,
      action: event.action,
      repoFullName,
      status: "received",
      statusCode: 200,
      durationMs: Date.now() - startTime,
      error: null,
    });
    return Response.json({ received: true, cached: true });
  }

  let pullRequest;
  try {
    pullRequest = await savePullRequest(event);
  } catch {
    return Response.json(
      { error: "Failed to save pull request" },
      { status: 500 }
    );
  }

  let userId: string | null = null;
  try {
    userId = await getUserIdByInstallationId(event.installation.id);
  } catch {
    // Non-fatal — continue without user context
  }

  if (userId) {
    try {
      const allowed = await canUserReview(userId);
      if (!allowed) {
        await prisma.pullRequest.update({
          where: { id: pullRequest.id },
          data: { status: "rate_limited" },
        });

        logEvent({
          eventName,
          action: event.action,
          repoFullName,
          status: "failed",
          statusCode: 429,
          durationMs: Date.now() - startTime,
          error: "Rate limited — user exceeded free monthly limit",
        });

        return Response.json({ received: true, rateLimited: true });
      }
    } catch {
      // Non-fatal — allow review to proceed if usage check fails
    }
  }

  logEvent({
    eventName,
    action: event.action,
    repoFullName,
    status: "processed",
    statusCode: 200,
    durationMs: Date.now() - startTime,
    error: null,
  });

  try {
    await inngest.send({
      name: "github/pr.received",
      data: { pullRequestId: pullRequest.id },
    });
  } catch {
    return Response.json(
      { error: "Failed to queue review" },
      { status: 500 }
    );
  }

  return Response.json({ received: true });
}
