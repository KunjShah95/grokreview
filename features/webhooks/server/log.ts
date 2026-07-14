import type { WebhookEvent } from "@/features/webhooks/types";

/**
 * In-memory webhook event log.
 * Stores the last 200 webhook events for debugging purposes.
 * In production, this would be stored in the database.
 */
const MAX_LOG_SIZE = 200;
const eventLog: WebhookEvent[] = [];

let eventCounter = 0;

export function logWebhookEvent(event: {
  eventName: string;
  action: string | null;
  repoFullName: string | null;
  status: "received" | "processed" | "failed";
  statusCode: number;
  durationMs: number;
  payload: string;
  error: string | null;
}): WebhookEvent {
  const id = `wh-${++eventCounter}-${Date.now()}`;
  const entry: WebhookEvent = {
    id,
    ...event,
    createdAt: new Date().toISOString(),
  };

  eventLog.unshift(entry);
  if (eventLog.length > MAX_LOG_SIZE) {
    eventLog.pop();
  }

  return entry;
}

export function getWebhookLog(
  limit = 50,
  eventFilter?: string
): WebhookEvent[] {
  let log = eventLog;
  if (eventFilter && eventFilter !== "all") {
    log = log.filter((e) => e.eventName === eventFilter);
  }
  return log.slice(0, limit);
}

export function getWebhookLogStats() {
  const total = eventLog.length;
  const received = eventLog.filter((e) => e.status === "received").length;
  const processed = eventLog.filter((e) => e.status === "processed").length;
  const failed = eventLog.filter((e) => e.status === "failed").length;
  const eventTypes = [...new Set(eventLog.map((e) => e.eventName))];

  return {
    total,
    received,
    processed,
    failed,
    eventTypes,
  };
}

export function clearWebhookLog() {
  eventLog.length = 0;
  eventCounter = 0;
}
