import type { GithubInstallationStatus } from "@/features/dashboard/lib/types";
import { getGithubApp } from "@/features/github/utils/github-app";
import { prisma } from "@/lib/db";

function getAccountLogin(
  account: { login?: string; slug?: string } | null | undefined
): string | null {
  if (!account) {
    return null;
  }
  if ("login" in account && account.login) {
    return account.login;
  }
  if (account.slug) {
    return account.slug;
  }
  return null;
}

function buildDisconnectedStatus(): GithubInstallationStatus {
  return { connected: false, accountLogin: null, installedAt: null };
}

export async function getInstallationStatus(userId: string) {
  const installation = await prisma.githubInstallation.findUnique({
    where: { userId },
  });

  if (!installation) {
    return buildDisconnectedStatus();
  }

  return {
    connected: true,
    accountLogin: installation.accountLogin,
    installedAt: installation.createdAt.toISOString(),
  };
}

export async function saveInstallation(
  userId: string,
  installationId: number
) {
  const app = getGithubApp();
  let data: { account?: { login?: string; slug?: string } | null; target_type?: string | null };
  try {
    const response = await app.octokit.request(
      "GET /app/installations/{installation_id}",
      { installation_id: installationId }
    );
    data = response.data;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to verify GitHub installation ${installationId}: ${message}`
    );
  }

  const accountLogin = getAccountLogin(data.account);

  await prisma.githubInstallation.upsert({
    where: { userId },
    create: {
      userId,
      installationId,
      accountLogin,
      accountType: data.target_type ?? null,
    },
    update: {
      installationId,
      accountLogin,
      accountType: data.target_type ?? null,
    },
  });
}

export async function deleteInstallation(userId: string) {
  try {
    await prisma.githubInstallation.delete({ where: { userId } });
  } catch {
    // Installation may have already been deleted — safe to ignore
  }
}

export async function getUserIdByInstallationId(installationId: number) {
  const installation = await prisma.githubInstallation.findFirst({
    where: { installationId },
    select: { userId: true },
  });
  if (!installation) {
    return null;
  }
  return installation.userId;
}

export async function getUserInstallationId(userId: string) {
  const installation = await prisma.githubInstallation.findUnique({
    where: { userId },
    select: { installationId: true },
  });
  if (!installation) {
    return null;
  }
  return installation.installationId;
}
