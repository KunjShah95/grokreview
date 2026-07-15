import { prisma } from "@/lib/db";
import { getUserInstallationId } from "@/features/github/server/installation";
import { SEVERITY_WEIGHT, type SecuritySeverity } from "@/features/security/types";

export type PRSecurityFindingSummary = {
  id: string;
  filePath: string;
  line: number | null;
  severity: string;
  category: string;
  message: string;
  suggestion: string | null;
};

export type PRGeneratedTestSummary = {
  id: string;
  filePath: string;
  testFilePath: string;
  framework: string;
  content: string;
};

export type PRReviewHistoryItem = {
  id: string;
  installationId: number;
  repoFullName: string;
  prNumber: number;
  title: string;
  authorLogin: string | null;
  headSha: string;
  baseBranch: string;
  status: string;
  model: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  complexityScore: number | null;
  createdAt: string;
  updatedAt: string;
  securityFindings: PRSecurityFindingSummary[];
  generatedTests: PRGeneratedTestSummary[];
};

export type PRHistoryFilters = {
  status?: string;
  repo?: string;
  search?: string;
  model?: string;
};

export async function getPRReviewHistory(
  userId: string,
  filters?: PRHistoryFilters
): Promise<PRReviewHistoryItem[]> {
  // Get the user's GitHub installation to find their PRs
  const installationId = await getUserInstallationId(userId);
  if (!installationId) {
    return [];
  }

  const where: Record<string, unknown> = {
    installationId,
  };

  if (filters?.status && filters.status !== "all") {
    where.status = filters.status;
  }

  if (filters?.repo) {
    where.repoFullName = { contains: filters.repo, mode: "insensitive" };
  }

  if (filters?.model) {
    where.model = filters.model;
  }

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { repoFullName: { contains: filters.search, mode: "insensitive" } },
      { authorLogin: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const prs = await prisma.pullRequest.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      securityFindings: true,
      generatedTests: true,
    },
  });

  return prs.map((pr) => ({
    id: pr.id,
    installationId: pr.installationId,
    repoFullName: pr.repoFullName,
    prNumber: pr.prNumber,
    title: pr.title,
    authorLogin: pr.authorLogin,
    headSha: pr.headSha,
    baseBranch: pr.baseBranch,
    status: pr.status,
    model: pr.model,
    reviewComment: pr.reviewComment,
    reviewedAt: pr.reviewedAt?.toISOString() ?? null,
    complexityScore: pr.complexityScore,
    createdAt: pr.createdAt.toISOString(),
    updatedAt: pr.updatedAt.toISOString(),
    securityFindings: [...pr.securityFindings]
      .sort(
        (a, b) =>
          (SEVERITY_WEIGHT[b.severity as SecuritySeverity] ?? 0) -
          (SEVERITY_WEIGHT[a.severity as SecuritySeverity] ?? 0)
      )
      .map((f) => ({
        id: f.id,
        filePath: f.filePath,
        line: f.line,
        severity: f.severity,
        category: f.category,
        message: f.message,
        suggestion: f.suggestion,
      })),
    generatedTests: pr.generatedTests.map((t) => ({
      id: t.id,
      filePath: t.filePath,
      testFilePath: t.testFilePath,
      framework: t.framework,
      content: t.content,
    })),
  }));
}

/**
 * Get the distinct models used for reviews, along with counts.
 */
export async function getAvailableModels(userId: string) {
  const installationId = await getUserInstallationId(userId);
  if (!installationId) {
    return [];
  }

  const models = await prisma.pullRequest.groupBy({
    by: ["model"],
    where: {
      installationId,
      model: { not: null },
    },
    _count: { model: true },
    orderBy: { _count: { model: "desc" } },
  });

  return models.map((m) => ({
    model: m.model as string,
    count: m._count.model,
  }));
}

export async function getPRReviewStats(userId: string) {
  const installationId = await getUserInstallationId(userId);
  if (!installationId) {
    return { total: 0, reviewed: 0, pending: 0, processing: 0, rateLimited: 0 };
  }

  const [total, reviewed, pending, processing, rateLimited] = await Promise.all([
    prisma.pullRequest.count({ where: { installationId } }),
    prisma.pullRequest.count({ where: { installationId, status: "reviewed" } }),
    prisma.pullRequest.count({ where: { installationId, status: "pending" } }),
    prisma.pullRequest.count({ where: { installationId, status: "processing" } }),
    prisma.pullRequest.count({ where: { installationId, status: "rate_limited" } }),
  ]);

  return { total, reviewed, pending, processing, rateLimited };
}
