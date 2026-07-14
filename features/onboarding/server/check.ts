import { getInstallationStatus } from "@/features/github/server/installation";
import { prisma } from "@/lib/db";

export type OnboardingStatus = {
  githubConnected: boolean;
  hasReviews: boolean;
  completedSteps: number;
  totalSteps: number;
};

export async function getOnboardingStatus(
  userId: string
): Promise<OnboardingStatus> {
  const installation = await getInstallationStatus(userId);
  const reviewCount = await prisma.pullRequest.count();

  const githubConnected = installation.connected;
  const hasReviews = reviewCount > 0;

  const completedSteps = [githubConnected, hasReviews].filter(Boolean).length;
  const totalSteps = 2;

  return { githubConnected, hasReviews, completedSteps, totalSteps };
}
