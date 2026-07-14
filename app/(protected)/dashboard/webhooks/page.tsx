import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { requireAuth } from "@/features/auth/actions";
import { WebhookLog } from "@/features/webhooks/components/webhook-log";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Webhook Events · Dashboard",
};

export default async function DashboardWebhooksPage() {
  await requireAuth();

  return (
    <>
      <DashboardHeader
        title="Webhook Events"
        description="Live feed of incoming GitHub webhook events for debugging."
      />
      <div className="flex flex-1 flex-col p-6">
        <WebhookLog initialLimit={100} autoRefresh />
      </div>
    </>
  );
}
