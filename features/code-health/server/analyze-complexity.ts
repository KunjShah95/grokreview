import type { RepoFile } from "@/features/repo-sync/types";

/**
 * A lightweight cyclomatic-complexity estimate: counts branching constructs
 * per file (if/else/for/while/case/catch/&&/||/ternary). This is a heuristic,
 * not a real AST-based analysis, but it's fast, dependency-free, and tracks
 * relative complexity well enough to surface hotspots on a dashboard.
 */
const BRANCH_PATTERN = /\b(if|else if|for|while|case|catch)\b|&&|\|\||\?[^.]/g;

export type FileComplexity = {
  filePath: string;
  complexity: number;
  lines: number;
};

/** Files above this estimated complexity are flagged as hotspots. */
export const HOTSPOT_COMPLEXITY_THRESHOLD = 25;

const TEST_FILE_PATTERN = /\.(test|spec)\.[jt]sx?$|(^|\/)test_.*\.py$|_test\.go$|__tests__\//;

export function analyzeFileComplexity(file: RepoFile): FileComplexity {
  const matches = file.content.match(BRANCH_PATTERN);
  return {
    filePath: file.filePath,
    complexity: 1 + (matches?.length ?? 0),
    lines: file.content.split("\n").length,
  };
}

export type ComplexitySummary = {
  complexityAvg: number;
  hotspotCount: number;
  hotspots: FileComplexity[];
  filesAnalyzed: number;
  testCoverageEst: number;
};

/**
 * Computes an aggregate complexity summary for a synced codebase.
 * testCoverageEst is a rough heuristic: the fraction of non-test source
 * files that have a plausibly-matching test file present in the same sync.
 */
export function computeComplexitySummary(files: RepoFile[]): ComplexitySummary {
  const sourceFiles = files.filter((f) => !TEST_FILE_PATTERN.test(f.filePath));
  const testFiles = files.filter((f) => TEST_FILE_PATTERN.test(f.filePath));
  const testFilePaths = new Set(testFiles.map((f) => f.filePath.toLowerCase()));

  const complexities = sourceFiles.map(analyzeFileComplexity);
  const hotspots = complexities
    .filter((c) => c.complexity >= HOTSPOT_COMPLEXITY_THRESHOLD)
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10);

  const complexityAvg =
    complexities.length > 0
      ? complexities.reduce((sum, c) => sum + c.complexity, 0) / complexities.length
      : 0;

  const filesWithLikelyTest = sourceFiles.filter((file) => {
    const base = file.filePath.replace(/\.[^./]+$/, "").toLowerCase();
    return [...testFilePaths].some((testPath) => testPath.includes(base.split("/").pop() ?? base));
  }).length;

  const testCoverageEst =
    sourceFiles.length > 0 ? Math.round((filesWithLikelyTest / sourceFiles.length) * 100) : 0;

  return {
    complexityAvg: Math.round(complexityAvg * 10) / 10,
    hotspotCount: hotspots.length,
    hotspots,
    filesAnalyzed: sourceFiles.length,
    testCoverageEst,
  };
}
