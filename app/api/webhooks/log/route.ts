import { NextResponse } from "next/server";
import { getWebhookLog, getWebhookLogStats } from "@/features/webhooks/server/log";

/**
 * GET /api/webhooks/log
 *
 * Returns the webhook event log for debugging purposes.
 * Query params: limit (default 50), filter (event type)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const filter = searchParams.get("filter") || "all";

  const events = getWebhookLog(limit, filter);
  const stats = getWebhookLogStats();

  return NextResponse.json({ events, stats });
}
