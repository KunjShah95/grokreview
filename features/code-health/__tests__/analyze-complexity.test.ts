import { describe, it, expect } from "vitest";
import { analyzeFileComplexity, computeComplexitySummary } from "../server/analyze-complexity";
import type { RepoFile } from "@/features/repo-sync/types";

describe("analyzeFileComplexity", () => {
  it("gives a flat function a baseline complexity of 1", () => {
    const file: RepoFile = { filePath: "add.ts", content: "export function add(a, b) {\n  return a + b;\n}" };
    expect(analyzeFileComplexity(file).complexity).toBe(1);
  });

  it("increases complexity for each branch", () => {
    const file: RepoFile = {
      filePath: "branchy.ts",
      content: [
        "function classify(n) {",
        "  if (n < 0) return 'negative';",
        "  else if (n === 0) return 'zero';",
        "  for (let i = 0; i < n; i++) {",
        "    if (i % 2 === 0 && i > 0) continue;",
        "  }",
        "  return 'positive';",
        "}",
      ].join("\n"),
    };
    expect(analyzeFileComplexity(file).complexity).toBeGreaterThan(1);
  });
});

describe("computeComplexitySummary", () => {
  it("flags files above the hotspot threshold and excludes test files", () => {
    const complexContent = Array.from({ length: 30 }, (_, i) => `if (x === ${i}) { doSomething(); }`).join("\n");
    const files: RepoFile[] = [
      { filePath: "src/hotspot.ts", content: complexContent },
      { filePath: "src/simple.ts", content: "export const x = 1;" },
      { filePath: "src/hotspot.test.ts", content: complexContent },
    ];

    const summary = computeComplexitySummary(files);
    expect(summary.filesAnalyzed).toBe(2); // test file excluded
    expect(summary.hotspots.some((h) => h.filePath === "src/hotspot.ts")).toBe(true);
    expect(summary.hotspots.some((h) => h.filePath === "src/hotspot.test.ts")).toBe(false);
  });

  it("returns zeroed summary for an empty file set", () => {
    const summary = computeComplexitySummary([]);
    expect(summary.complexityAvg).toBe(0);
    expect(summary.hotspotCount).toBe(0);
    expect(summary.filesAnalyzed).toBe(0);
    expect(summary.testCoverageEst).toBe(0);
  });
});
