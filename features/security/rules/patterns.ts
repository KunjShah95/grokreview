import type { PrFile } from "@/features/reviews/types/review";
import type { SecurityCategory, SecurityFindingInput, SecuritySeverity } from "../types";

// Mirrored (not imported) in cli/src/utils/security-rules.ts and
// mcp/src/security.ts — those are standalone published packages that can't
// depend on this app's `@/` aliases or Prisma types. If you add/change a
// rule here, update the other two files too. See CONTRIBUTING.md for why
// this isn't a shared package.

type VulnRule = {
  category: SecurityCategory;
  severity: SecuritySeverity;
  pattern: RegExp;
  message: string;
  suggestion: string;
};

/**
 * Deterministic heuristics for common vulnerability shapes. These are
 * intentionally conservative (favor precision over recall) since they run
 * on every diff with no AI cost. The AI-assisted pass in scan-pr.ts catches
 * the subtler cases these regexes miss.
 */
const VULN_RULES: VulnRule[] = [
  {
    category: "sql-injection",
    severity: "high",
    pattern: /(query|execute)\s*\([^)]*(\$\{|['"`]\s*\+|\+\s*['"`])/i,
    message: "Possible SQL injection: query built via string concatenation or interpolation instead of a parameterized query.",
    suggestion: "Use parameterized queries / prepared statements (e.g. `db.query('... WHERE id = $1', [id])`) instead of interpolating values into the SQL string.",
  },
  {
    category: "xss",
    severity: "high",
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=(?!\s*["'`]\s*["'`])|document\.write\s*\(/,
    message: "Possible XSS: raw HTML is being injected into the DOM without sanitization.",
    suggestion: "Sanitize the HTML (e.g. with DOMPurify) before rendering, or avoid raw HTML injection entirely.",
  },
  {
    category: "ssrf",
    severity: "high",
    pattern: /(fetch|axios\.get|request|http\.get)\s*\(\s*(req\.(query|body|params)|`[^`]*\$\{)/,
    message: "Possible SSRF: an outbound request URL appears to be built from unvalidated user input.",
    suggestion: "Validate and allow-list the destination host before making the outbound request.",
  },
  {
    category: "insecure-config",
    severity: "medium",
    pattern: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/,
    message: "TLS certificate validation is disabled.",
    suggestion: "Remove the override and fix the underlying certificate issue instead of disabling TLS verification.",
  },
  {
    category: "insecure-config",
    severity: "medium",
    pattern: /eval\s*\(|new Function\s*\(/,
    message: "Use of eval()/Function() constructor — can execute arbitrary code if input is attacker-influenced.",
    suggestion: "Avoid eval/Function; use JSON.parse or an explicit parser for structured data.",
  },
  {
    category: "insecure-config",
    severity: "low",
    pattern: /child_process\.(exec|execSync)\s*\(\s*(`[^`]*\$\{|['"]\s*\+)/,
    message: "Shell command built via string concatenation — possible command injection.",
    suggestion: "Use execFile/spawn with an argument array instead of building a shell string, or strictly validate the input.",
  },
];

function getAddedLines(patch: string): Array<{ line: string; lineNumber: number }> {
  const results: Array<{ line: string; lineNumber: number }> = [];
  let newLineNumber = 0;

  for (const rawLine of patch.split("\n")) {
    const hunkMatch = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLineNumber = parseInt(hunkMatch[1], 10) - 1;
      continue;
    }
    if (rawLine.startsWith("+++") || rawLine.startsWith("---")) {
      continue;
    }
    if (rawLine.startsWith("+")) {
      newLineNumber += 1;
      results.push({ line: rawLine.slice(1), lineNumber: newLineNumber });
    } else if (!rawLine.startsWith("-")) {
      newLineNumber += 1;
    }
  }
  return results;
}

/** Scans PR diffs for common vulnerability shapes using deterministic heuristics. */
export function scanForVulnPatterns(files: PrFile[]): SecurityFindingInput[] {
  const findings: SecurityFindingInput[] = [];

  for (const file of files) {
    const addedLines = getAddedLines(file.patch);
    for (const { line, lineNumber } of addedLines) {
      for (const rule of VULN_RULES) {
        if (rule.pattern.test(line)) {
          findings.push({
            filePath: file.filePath,
            line: lineNumber,
            severity: rule.severity,
            category: rule.category,
            message: rule.message,
            suggestion: rule.suggestion,
          });
        }
      }
    }
  }

  return findings;
}
