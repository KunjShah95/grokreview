import type { PrFile } from "@/features/reviews/types/review";
import type { SecurityFindingInput } from "../types";

/**
 * High-confidence, deterministic secret patterns. Kept regex-only (no AI call)
 * so detection is fast, free, and reproducible — this runs on every PR diff.
 */
const SECRET_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  message: string;
}> = [
  {
    name: "aws-access-key",
    pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/,
    message: "AWS access key ID detected in code.",
  },
  {
    name: "aws-secret-key",
    pattern: /aws_secret_access_key\s*[:=]\s*['"][A-Za-z0-9/+=]{40}['"]/i,
    message: "AWS secret access key detected in code.",
  },
  {
    name: "private-key",
    pattern: /-----BEGIN\s+(RSA|EC|OPENSSH|DSA|PGP)?\s*PRIVATE KEY-----/,
    message: "Private key material detected in code.",
  },
  {
    name: "github-token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/,
    message: "GitHub access token detected in code.",
  },
  {
    name: "slack-token",
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,80}\b/,
    message: "Slack token detected in code.",
  },
  {
    name: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
    message: "Google API key detected in code.",
  },
  {
    name: "generic-api-key-assignment",
    pattern: /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_\-/.]{16,}['"]/i,
    message: "Hardcoded credential-like assignment detected — verify this isn't a real secret.",
  },
  {
    name: "stripe-key",
    pattern: /\bsk_(live|test)_[0-9A-Za-z]{16,}\b/,
    message: "Stripe secret key detected in code.",
  },
  {
    name: "jwt",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    message: "Hardcoded JWT detected in code.",
  },
];

/** Only scan lines added in the diff (prefixed with "+", not "+++"). */
function getAddedLines(patch: string): Array<{ line: string; lineNumber: number }> {
  const results: Array<{ line: string; lineNumber: number }> = [];
  let newLineNumber = 0;

  for (const rawLine of patch.split("\n")) {
    const hunkMatch = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLineNumber = parseInt(hunkMatch[1], 10) - 1;
      continue;
    }
    if (rawLine.startsWith("+++") || rawLine.startsWith("---") || rawLine.startsWith("\\")) {
      // File headers and diff metadata markers (e.g. "\ No newline at end of
      // file") aren't source lines — counting them shifts every subsequent
      // reported line number by one.
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

/** Scans PR diffs for hardcoded secrets using deterministic regex rules. */
export function scanForSecrets(files: PrFile[]): SecurityFindingInput[] {
  const findings: SecurityFindingInput[] = [];

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
            suggestion: "Remove the secret from source control, rotate it immediately, and load it from an environment variable or secret manager instead.",
          });
        }
      }
    }
  }

  return findings;
}
