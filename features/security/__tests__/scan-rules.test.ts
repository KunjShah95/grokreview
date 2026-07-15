import { describe, it, expect } from "vitest";
import { scanForSecrets } from "../rules/secrets";
import { scanForVulnPatterns } from "../rules/patterns";
import type { PrFile } from "@/features/reviews/types/review";

function makeDiff(addedLines: string[]): string {
  return [`@@ -1,1 +1,${addedLines.length} @@`, ...addedLines.map((l) => `+${l}`)].join("\n");
}

describe("scanForSecrets", () => {
  it("flags a hardcoded AWS access key", () => {
    const files: PrFile[] = [
      { filePath: "config.ts", patch: makeDiff(['const key = "AKIAIOSFODNN7EXAMPLE";']) },
    ];
    const findings = scanForSecrets(files);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].category).toBe("secret");
    expect(findings[0].filePath).toBe("config.ts");
  });

  it("flags a GitHub token", () => {
    const files: PrFile[] = [
      { filePath: ".env", patch: makeDiff([`GITHUB_TOKEN=ghp_${"a".repeat(36)}`]) },
    ];
    expect(scanForSecrets(files)).toHaveLength(1);
  });

  it("does not flag clean code", () => {
    const files: PrFile[] = [
      { filePath: "index.ts", patch: makeDiff(["export function add(a: number, b: number) {", "  return a + b;", "}"]) },
    ];
    expect(scanForSecrets(files)).toHaveLength(0);
  });

  it("ignores removed lines (only scans additions)", () => {
    const files: PrFile[] = [
      {
        filePath: "config.ts",
        patch: `@@ -1,1 +1,1 @@\n-const key = "AKIAIOSFODNN7EXAMPLE";\n+const key = process.env.AWS_KEY;`,
      },
    ];
    expect(scanForSecrets(files)).toHaveLength(0);
  });
});

describe("scanForVulnPatterns", () => {
  it("flags string-concatenated SQL queries", () => {
    const files: PrFile[] = [
      { filePath: "db.ts", patch: makeDiff(['db.query("SELECT * FROM users WHERE id = " + userId);']) },
    ];
    const findings = scanForVulnPatterns(files);
    expect(findings.some((f) => f.category === "sql-injection")).toBe(true);
  });

  it("flags dangerouslySetInnerHTML", () => {
    const files: PrFile[] = [
      { filePath: "page.tsx", patch: makeDiff(["<div dangerouslySetInnerHTML={{ __html: userInput }} />"]) },
    ];
    const findings = scanForVulnPatterns(files);
    expect(findings.some((f) => f.category === "xss")).toBe(true);
  });

  it("flags disabled TLS verification", () => {
    const files: PrFile[] = [
      { filePath: "client.ts", patch: makeDiff(["const agent = new https.Agent({ rejectUnauthorized: false });"]) },
    ];
    const findings = scanForVulnPatterns(files);
    expect(findings.some((f) => f.category === "insecure-config")).toBe(true);
  });

  it("does not flag safe parameterized queries", () => {
    const files: PrFile[] = [
      { filePath: "db.ts", patch: makeDiff(["db.query('SELECT * FROM users WHERE id = $1', [userId]);"]) },
    ];
    expect(scanForVulnPatterns(files)).toHaveLength(0);
  });
});
