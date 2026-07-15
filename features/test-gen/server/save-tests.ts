import { prisma } from "@/lib/db";
import type { GeneratedTestInput } from "../types";

/** Persists generated tests for a pull request, replacing any prior generation results. */
export async function saveGeneratedTests(pullRequestId: string, tests: GeneratedTestInput[]) {
  await prisma.generatedTest.deleteMany({ where: { pullRequestId } });

  if (tests.length === 0) {
    return;
  }

  await prisma.generatedTest.createMany({
    data: tests.map((test) => ({
      pullRequestId,
      filePath: test.filePath,
      testFilePath: test.testFilePath,
      framework: test.framework,
      content: test.content,
    })),
  });
}

export async function getGeneratedTests(pullRequestId: string) {
  return prisma.generatedTest.findMany({
    where: { pullRequestId },
    orderBy: { createdAt: "asc" },
  });
}
