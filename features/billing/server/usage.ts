import { startOfMonth } from "date-fns";
import { getUserInstallationId } from "@/features/github/server/installation";
import { getUserSubscription } from "@/features/billing/server/subscription";
import { prisma } from "@/lib/db";

export const FREE_MONTHLY_LIMIT = 5;

export type UsageSummary = {
  used: number;
  limit: number | null;
};

export async function getReviewsThisMonth(userId: string): Promise<number> {
  const installationId = await getUserInstallationId(userId);
  if (!installationId) {
    return 0;
  }

  return prisma.pullRequest.count({
    where: {
      installationId,
      status: "reviewed",
      reviewedAt: { gte: startOfMonth(new Date()) },
    },
  });
}

export async function canUserReview(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (subscription.plan === "pro" && subscription.status === "active") {
    return true;
  }
  const used = await getReviewsThisMonth(userId);
  return used < FREE_MONTHLY_LIMIT;
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const subscription = await getUserSubscription(userId);
  const used = await getReviewsThisMonth(userId);

  if (subscription.plan === "pro" && subscription.status === "active") {
    return { used, limit: null };
  }

  return { used, limit: FREE_MONTHLY_LIMIT };
}

/**
 * Other AI-assisted actions (security re-scan, test generation, repo chat)
 * share their own free-tier quota — separate from the "5 reviews/month"
 * quota above, since none of these actions ever change a PullRequest's
 * status to "reviewed" and so never move the needle on getReviewsThisMonth.
 */
export type AiActionKind = "security_scan" | "test_gen" | "chat";

export async function getAiActionsThisMonth(userId: string): Promise<number> {
  return prisma.aiActionUsage.count({
    where: { userId, createdAt: { gte: startOfMonth(new Date()) } },
  });
}

export async function canPerformAiAction(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (subscription.plan === "pro" && subscription.status === "active") {
    return true;
  }
  const used = await getAiActionsThisMonth(userId);
  return used < FREE_MONTHLY_LIMIT;
}

/** Records a completed AI action (scan/test-gen/chat message) against the monthly quota above. */
export async function recordAiAction(userId: string, kind: AiActionKind): Promise<void> {
  await prisma.aiActionUsage.create({ data: { userId, kind } });
}
