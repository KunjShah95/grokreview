import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { requireAuth } from "@/features/auth/actions";
import { getDetailedUsage } from "@/features/usage/server/usage-stats";
import { UsageDashboard } from "@/features/usage/components/usage-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usage · Dashboard",
};

export default async function DashboardUsagePage() {
  const session = await requireAuth();
  const usageStats = await getDetailedUsage(session.user.id);

  return (
    <>
      <DashboardHeader
        title="Usage"
        description="Track your AI review usage, monthly limits, and costs across all models."
      />
      <UsageDashboard stats={usageStats} />
    </>
  );
}
