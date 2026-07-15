"use client";

import { useState } from "react";
import { ShieldCheck, ShieldWarning, ArrowClockwise } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PRSecurityFindingSummary } from "@/features/reviews/server/get-pr-history";

const SEVERITY_STYLES: Record<string, { variant: "destructive" | "secondary" | "outline"; className?: string }> = {
  critical: { variant: "destructive" },
  high: { variant: "destructive", className: "opacity-80" },
  medium: { variant: "secondary" },
  low: { variant: "outline" },
  info: { variant: "outline" },
};

const CATEGORY_LABELS: Record<string, string> = {
  secret: "Leaked Secret",
  "sql-injection": "SQL Injection",
  xss: "XSS",
  ssrf: "SSRF",
  dependency: "Dependency",
  "insecure-config": "Insecure Config",
  other: "Other",
};

type SecurityFindingsListProps = {
  pullRequestId: string;
  findings: PRSecurityFindingSummary[];
};

export function SecurityFindingsList({ pullRequestId, findings: initialFindings }: SecurityFindingsListProps) {
  const [findings, setFindings] = useState(initialFindings);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRescan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const response = await fetch("/api/security/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pullRequestId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Scan failed");
      }
      setFindings(data.findings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          {findings.length > 0 ? (
            <ShieldWarning className="size-3.5 text-destructive" />
          ) : (
            <ShieldCheck className="size-3.5 text-green-500" />
          )}
          Security ({findings.length})
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={handleRescan}
          disabled={isScanning}
        >
          {isScanning ? <Spinner className="size-3" /> : <ArrowClockwise className="size-3" />}
          Re-scan
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {findings.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No security issues found in this diff.</p>
      ) : (
        <div className="space-y-1.5">
          {findings.map((finding) => {
            const style = SEVERITY_STYLES[finding.severity] || { variant: "outline" as const };
            return (
              <div key={finding.id} className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant={style.variant} className={`uppercase ${style.className ?? ""}`}>
                    {finding.severity}
                  </Badge>
                  <Badge variant="outline">{CATEGORY_LABELS[finding.category] || finding.category}</Badge>
                  <code className="text-[11px] text-muted-foreground">
                    {finding.filePath}
                    {finding.line ? `:${finding.line}` : ""}
                  </code>
                </div>
                <p className="text-xs">{finding.message}</p>
                {finding.suggestion && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Fix:</span> {finding.suggestion}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
