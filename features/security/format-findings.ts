import { SEVERITY_WEIGHT, type SecurityFindingInput, type SecuritySeverity } from "./types";

const SEVERITY_EMOJI: Record<SecuritySeverity, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "⚪",
  info: "⚪",
};

/**
 * Formats security findings as a markdown section for the posted PR review.
 * Returns an empty string when there are no findings (nothing to append).
 */
export function formatFindingsForReview(findings: SecurityFindingInput[]): string {
  if (findings.length === 0) {
    return "";
  }

  const sorted = [...findings].sort(
    (a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]
  );

  const lines = sorted.map((finding) => {
    const location = `\`${finding.filePath}${finding.line ? `:${finding.line}` : ""}\``;
    const suggestion = finding.suggestion ? `\n  *Fix: ${finding.suggestion}*` : "";
    return `- ${SEVERITY_EMOJI[finding.severity]} **${finding.severity.toUpperCase()}** (${finding.category}) ${location} — ${finding.message}${suggestion}`;
  });

  return `\n\n### 🛡️ Security Findings (${findings.length})\n${lines.join("\n")}`;
}

/** Whether any finding represents a leaked secret — the only category with near-zero false positives. */
export function hasLeakedSecret(findings: SecurityFindingInput[]): boolean {
  return findings.some((f) => f.category === "secret");
}
