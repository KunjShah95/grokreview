import type { PrFile } from "./github.js";

// Mirrored (not imported) from features/security/rules/{patterns,secrets}.ts —
// this is a standalone published package and can't depend on the web app's
// `@/` aliases or Prisma types. If you add/change a rule here, update the
// web app copy and cli/src/utils/security-rules.ts too. See CONTRIBUTING.md
// for why this isn't a shared package.

export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "info";
export type SecurityCategory = "secret" | "sql-injection" | "xss" | "ssrf" | "dependency" | "insecure-config" | "other";

export type SecurityFinding = {
  filePath: string;
  line?: number;
  severity: SecuritySeverity;
  category: SecurityCategory;
  message: string;
  suggestion?: string;
};

type SecretRule = { pattern: RegExp; message: string };

const SECRET_PATTERNS: SecretRule[] = [
  { pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/, message: "AWS access key ID detected in code." },
  {
    pattern: /aws_secret_access_key\s*[:=]\s*['"][A-Za-z0-9/+=]{40}['"]/i,
    message: "AWS secret access key detected in code.",
  },
  {
    pattern: /-----BEGIN\s+(RSA|EC|OPENSSH|DSA|PGP)?\s*PRIVATE KEY-----/,
    message: "Private key material detected in code.",
  },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/, message: "GitHub access token detected in code." },
  { pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,80}\b/, message: "Slack token detected in code." },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/, message: "Google API key detected in code." },
  {
    pattern: /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_\-/.]{16,}['"]/i,
    message: "Hardcoded credential-like assignment detected — verify this isn't a real secret.",
  },
  { pattern: /\bsk_(live|test)_[0-9A-Za-z]{16,}\b/, message: "Stripe secret key detected in code." },
  {
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    message: "Hardcoded JWT detected in code.",
  },
];

type VulnRule = { category: SecurityCategory; severity: SecuritySeverity; pattern: RegExp; message: string; suggestion: string };

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
    // File headers and diff metadata markers (e.g. "\ No newline at end of
    // file") aren't source lines — counting them shifts every subsequent
    // reported line number by one.
    if (rawLine.startsWith("+++") || rawLine.startsWith("---") || rawLine.startsWith("\\")) continue;
    if (rawLine.startsWith("+")) {
      newLineNumber += 1;
      results.push({ line: rawLine.slice(1), lineNumber: newLineNumber });
    } else if (!rawLine.startsWith("-")) {
      newLineNumber += 1;
    }
  }
  return results;
}

/** Deterministic regex-based scan for hardcoded secrets and common vulnerability shapes. */
export function scanFiles(files: PrFile[]): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const file of files) {
    const addedLines = getAddedLines(file.patch);
    for (const { line, lineNumber } of addedLines) {
      for (const rule of SECRET_PATTERNS) {
        if (rule.pattern.test(line)) {
          findings.push({
            filePath: file.filePath,
            line: lineNumber,
            severity: "critical",
            category: "secret",
            message: rule.message,
            suggestion:
              "Remove the secret from source control, rotate it immediately, and load it from an environment variable or secret manager instead.",
          });
        }
      }
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
