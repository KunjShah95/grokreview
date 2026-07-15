"use client";

import { useState } from "react";
import { TestTube, Copy, Check, ArrowClockwise } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { PRGeneratedTestSummary } from "@/features/reviews/server/get-pr-history";

type GeneratedTestsListProps = {
  pullRequestId: string;
  tests: PRGeneratedTestSummary[];
};

function TestCard({ test }: { test: PRGeneratedTestSummary }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(test.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <code className="text-[11px]">{test.testFilePath}</code>
          <Badge variant="outline">{test.framework}</Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={handleCopy}>
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-64 overflow-auto p-3 text-xs leading-relaxed font-mono bg-muted/10">
        {test.content}
      </pre>
    </div>
  );
}

export function GeneratedTestsList({ pullRequestId, tests: initialTests }: GeneratedTestsListProps) {
  const [tests, setTests] = useState(initialTests);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/test-gen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pullRequestId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Test generation failed");
      }
      setTests(data.tests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <TestTube className="size-3.5" />
          Generated Tests ({tests.length})
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? <Spinner className="size-3" /> : <ArrowClockwise className="size-3" />}
          Generate
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {tests.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No tests generated yet for this PR&apos;s changed files.
        </p>
      ) : (
        <div className="space-y-2">
          {tests.map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      )}
    </div>
  );
}
