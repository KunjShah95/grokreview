"use client";

import { useState, useEffect, useRef } from "react";
import { useStreamingReview } from "@/features/reviews/hooks/use-streaming-review";
import type { AIProvider } from "@/features/ai";
import { AVAILABLE_MODELS, getConfiguredProviders } from "@/features/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Stop,
  WarningCircle,
  CheckCircle,
} from "@phosphor-icons/react";

type StreamingReviewProps = {
  repoFullName: string;
  title: string;
  contextSnippets: string[];
  repoContextSnippets?: string[];
  onReviewComplete?: (text: string, model: string) => void;
};

const STATUS_CONFIG = {
  idle: { icon: null, label: "Ready to review" },
  connecting: { icon: null, label: "Connecting..." },
  streaming: { icon: null, label: "Generating review..." },
  done: { icon: CheckCircle, label: "Review complete!" },
  error: { icon: WarningCircle, label: "Review failed" },
} as const;

export function StreamingReview({
  repoFullName,
  title,
  contextSnippets,
  repoContextSnippets = [],
  onReviewComplete,
}: StreamingReviewProps) {
  const {
    status,
    tokens,
    error,
    provider: activeProvider,
    modelId: activeModelId,
    startReview,
    cancelReview,
    resetReview,
  } = useStreamingReview();

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("groq");
  const [selectedModel, setSelectedModel] = useState<string>("llama3-8b-8192");

  // Get available models for the selected provider
  const availableModels = AVAILABLE_MODELS.filter(
    (m) => m.provider === selectedProvider
  );

  const handleStart = async () => {
    await startReview({
      provider: selectedProvider,
      modelId: selectedModel,
      repoFullName,
      title,
      contextSnippets,
      repoContextSnippets,
    });
  };

  // Notify parent on completion
  const prevStatusRef = useRef<string>(status);
  useEffect(() => {
    if (status === "done" && prevStatusRef.current === "streaming") {
      onReviewComplete?.(tokens, `${activeProvider}/${activeModelId}`);
    }
    prevStatusRef.current = status;
  }, [status, tokens, onReviewComplete, activeProvider, activeModelId]);

  const isActive = status === "streaming" || status === "connecting";

  return (
    <div className="space-y-4">
      {/* Model Selector & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Provider Select */}
          <select
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
            value={selectedProvider}
            onChange={(e) => {
              const p = e.target.value as AIProvider;
              setSelectedProvider(p);
              const firstModel = AVAILABLE_MODELS.find((m) => m.provider === p);
              if (firstModel) setSelectedModel(firstModel.modelId);
            }}
            disabled={isActive}
          >
            {getConfiguredProviders().map((p) => (
              <option key={p.provider} value={p.provider}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Model Select */}
          <select
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isActive}
          >
            {availableModels.map((m) => (
              <option key={m.modelId} value={m.modelId}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Status badge */}
          {status !== "idle" && (
            <Badge
              variant={
                status === "error"
                  ? "destructive"
                  : status === "done"
                  ? "default"
                  : "secondary"
              }
              className="text-[10px]"
            >
              {STATUS_CONFIG[status].label}
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={cancelReview}
            >
              <Stop className="size-3" />
              Stop
            </Button>
          ) : status === "done" || status === "error" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={resetReview}
              >
                Clear
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={handleStart}
              >
                <Play className="size-3" />
                Review Again
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={handleStart}
            >
              <Play className="size-3" />
              Start Review
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Streaming Content */}
      <div className="min-h-[200px] rounded-xl border border-border bg-muted/20 p-4">
        {status === "idle" ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground">
              Select a model and click &quot;Start Review&quot; to generate an AI code review in real-time.
            </p>
          </div>
        ) : status === "connecting" ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Spinner className="size-4" />
            <span className="text-xs text-muted-foreground">
              Connecting to {activeProvider}...
            </span>
          </div>
        ) : status === "error" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <WarningCircle className="size-4" />
              <span className="text-xs font-medium">Review Failed</span>
            </div>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {status === "streaming" && (
              <div className="flex items-center gap-2 pb-2">
                <Spinner className="size-3" />
                <span className="text-xs text-muted-foreground">
                  Generating with {activeProvider}/{activeModelId}...
                </span>
              </div>
            )}
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
              {tokens}
              {status === "streaming" && <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5" />}
            </pre>
          </div>
        )}
      </div>

      {/* Copy & Export actions when done */}
      {status === "done" && tokens && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => navigator.clipboard.writeText(tokens)}
          >
            Copy Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => {
              const blob = new Blob([tokens], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `review-${repoFullName.replace("/", "-")}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export as Markdown
          </Button>
        </div>
      )}
    </div>
  );
}
