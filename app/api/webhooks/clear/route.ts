import { NextResponse } from "next/server";
import { clearWebhookLog } from "@/features/webhooks/server/log";

/**
 * POST /api/webhooks/clear
 *
 * Clears the in-memory webhook event log.
 */
export async function POST() {
  clearWebhookLog();
  return NextResponse.json({ cleared: true });
}
