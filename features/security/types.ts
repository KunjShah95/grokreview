export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "info";

export type SecurityCategory =
  | "secret"
  | "sql-injection"
  | "xss"
  | "ssrf"
  | "dependency"
  | "insecure-config"
  | "other";

export type SecurityFindingInput = {
  filePath: string;
  line?: number;
  severity: SecuritySeverity;
  category: SecurityCategory;
  message: string;
  suggestion?: string;
};

export const SEVERITY_WEIGHT: Record<SecuritySeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};
