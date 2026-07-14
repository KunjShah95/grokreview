import { inngest } from "@/features/inngest/client";
import { prisma } from "@/lib/db";
import { startOfMonth } from "date-fns";
import { sendUsageAlertEmail } from "@/features/email/server/send-usage-alert";
import { FREE_MONTHLY_LIMIT } from "@/features/billing/server/usage";

/**
 * After a review completes, check if the user has reached 80% or 100%
 * of their monthly limit and send an email alert if one hasn't been sent
 * for this billing cycle + threshold.
 */
export const checkUsageAlert = inngest.createFunction(
  { id: "check-usage-alert", retries: 2, triggers: { event: "usage/alert.check" } },
  async ({ event, step }) => {
    const { userId } = event.data as { userId: string };
    const billingMonth = formatBillingMonth(new Date());

    // Guard: only free users get usage alerts
    const user = await step.run("fetch-user", async () => {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, plan: true, subscriptionStatus: true },
      });
    });

    if (!user) {
      console.warn(`[Usage Alert] User ${userId} not found`);
      return { skipped: true, reason: "user_not_found" };
    }

    // Pro users with active subscriptions have unlimited reviews — no alert needed
    if (user.plan === "pro" && user.subscriptionStatus === "active") {
      return { skipped: true, reason: "unlimited_plan" };
    }

    // Count reviews this month
    const used = await step.run("count-reviews", async () => {
      const installation = await prisma.githubInstallation.findUnique({
        where: { userId: user.id },
        select: { installationId: true },
      });
      if (!installation) return 0;

      return prisma.pullRequest.count({
        where: {
          installationId: installation.installationId,
          status: "reviewed",
          reviewedAt: { gte: startOfMonth(new Date()) },
        },
      });
    });

    const percentage = Math.min(100, Math.round((used / FREE_MONTHLY_LIMIT) * 100));

    // Determine which thresholds to check (80% → 100%)
    const thresholdsToCheck: Array<80 | 100> = [];
    if (percentage >= 100) thresholdsToCheck.push(100);
    if (percentage >= 80) thresholdsToCheck.push(80);

    if (thresholdsToCheck.length === 0) {
      return { skipped: true, reason: "below_threshold", used, percentage };
    }

    // Check and send for each threshold
    for (const threshold of thresholdsToCheck) {
      const alreadySent = await step.run(`check-already-sent-${threshold}`, async () => {
        const existing = await prisma.usageAlert.findUnique({
          where: {
            userId_billingMonth_threshold: {
              userId: user.id,
              billingMonth,
              threshold,
            },
          },
        });
        return !!existing;
      });

      if (alreadySent) {
        console.log(`[Usage Alert] ${threshold}% alert already sent for ${user.id} (${billingMonth})`);
        continue;
      }

      const daysLeft = await step.run(`compute-days-left`, () => {
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      });

      // Send email
      const emailResult = await step.run(`send-email-${threshold}`, async () => {
        return sendUsageAlertEmail({
          to: user.email,
          userName: user.name,
          used,
          limit: FREE_MONTHLY_LIMIT,
          percentage,
          threshold,
          daysLeft,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/usage`,
        });
      });

      if (emailResult.success && !("error" in emailResult)) {
        // Record the alert to prevent re-sending this cycle
        await step.run(`record-alert-${threshold}`, async () => {
          await prisma.usageAlert.create({
            data: {
              userId: user.id,
              threshold,
              billingMonth,
            },
          });
        });
        console.log(`[Usage Alert] ${threshold}% alert sent to ${user.email}`);
      } else {
        console.error(`[Usage Alert] Failed to send ${threshold}% alert to ${user.email}:`, emailResult.error);
      }
    }

    return { sent: true, userId: user.id, used, percentage };
  }
);

function formatBillingMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
