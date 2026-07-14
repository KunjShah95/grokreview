"use client";

import { useState } from "react";
import { useModelComparison, type CompareModelsConfig } from "@/features/reviews/hooks/use-model-comparison";
import type { AIProvider } from "@/features/ai";
import { AVAILABLE_MODELS } from "@/features/ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  ArrowsDownUp,
  Lightning,
  CheckCircle,
  WarningCircle,
  ArrowsClockwise,
  Copy,
} from "@phosphor-icons/react";

type ModelComparisonProps = {
  repoFullName: string;
  title: string;
  contextSnippets: string[];
};

// Recommended model pairs for quick comparison
const QUICK_PAIRS: Array<{ label: string; modelA: CompareModelsConfig["modelA"]; modelB: CompareModelsConfig["modelB"] }> = [
  {
    label: "Speed vs Quality",
    modelA: { provider: "groq", modelId: "llama3-8b-8192", label: "Groq Fast (8B)" },
    modelB: { provider: "groq", modelId: "llama3-70b-8192", label: "Groq Quality (70B)" },
  },
  {
    label: "Code Specialists",
    modelA: { provider: "groq", modelId: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 (70B)" },
    modelB: { provider: "mistral", modelId: "codestral-latest", label: "Codestral" },
  },
];

export function ModelComparison({ repoFullName, title, contextSnippets }: ModelComparisonProps) {
  const {
    status,
    result,
    error,
    progress,
    startComparison,
    resetComparison,
  } = useModelComparison();

  // Model A selector
  const [modelAProvider, setModelAProvider] = useState<AIProvider>("groq");
  const [modelAModelId, setModelAModelId] = useState("llama3-8b-8192");
  const modelsForA = AVAILABLE_MODELS.filter((m) => m.provider === modelAProvider);

  // Model B selector
  const [modelBProvider, setModelBProvider] = useState<AIProvider>("groq");
  const [modelBModelId, setModelBModelId] = useState("llama3-70b-8192");
  const modelsForB = AVAILABLE_MODELS.filter((m) => m.provider === modelBProvider);

  const handleCompare = () => {
    startComparison(
      { repoFullName, title, contextSnippets },
      {
        modelA: { provider: modelAProvider, modelId: modelAModelId, label: `${modelAProvider}/${modelAModelId}` },
        modelB: { provider: modelBProvider, modelId: modelBModelId, label: `${modelBProvider}/${modelBModelId}` },
      }
    );
  };

  const handleQuickPair = (pair: typeof QUICK_PAIRS[0]) => {
    setModelAProvider(pair.modelA.provider);
    setModelAModelId(pair.modelA.modelId);
    setModelBProvider(pair.modelB.provider);
    setModelBModelId(pair.modelB.modelId);
    startComparison({ repoFullName, title, contextSnippets }, pair);
  };

  const isLoading = status === "loading";
  const isDone = status === "done" && result;

  return (
    <div className="space-y-6">
      {/* Model Selectors */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Multi-Model Comparison</h3>
          <Badge variant="outline" className="text-[10px]">
            Compare 2 models
          </Badge>
        </div>

        {/* Quick Pairs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_PAIRS.map((pair) => (
            <Button
              key={pair.label}
              variant="outline"
              size="sm"
              className="h-7 text-[10px] gap-1"
              onClick={() => handleQuickPair(pair)}
              disabled={isLoading}
            >
              <Lightning className="size-3" />
              {pair.label}
            </Button>
          ))}
        </div>

        <Separator className="mb-4" />

        {/* Model A Selector */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Model A
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-xs"
                value={modelAProvider}
                onChange={(e) => {
                  const p = e.target.value as AIProvider;
                  setModelAProvider(p);
                  const first = AVAILABLE_MODELS.find((m) => m.provider === p);
                  if (first) setModelAModelId(first.modelId);
                }}
                disabled={isLoading}
              >
                {["groq", "mistral", "huggingface", "openrouter"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-xs"
                value={modelAModelId}
                onChange={(e) => setModelAModelId(e.target.value)}
                disabled={isLoading}
              >
                {modelsForA.map((m) => (
                  <option key={m.modelId} value={m.modelId}>{m.label}</option>
                ))}
              </select>
            </div>
            {isLoading && progress.modelA === "generating" && (
              <div className="flex items-center gap-1.5">
                <Spinner className="size-2.5" />
                <span className="text-[10px] text-muted-foreground">Generating...</span>
              </div>
            )}
            {isLoading && progress.modelA === "done" && (
              <span className="text-[10px] text-green-500 flex items-center gap-1">
                <CheckCircle className="size-2.5" /> Done
              </span>
            )}
          </div>

          {/* Model B Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Model B
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-xs"
                value={modelBProvider}
                onChange={(e) => {
                  const p = e.target.value as AIProvider;
                  setModelBProvider(p);
                  const first = AVAILABLE_MODELS.find((m) => m.provider === p);
                  if (first) setModelBModelId(first.modelId);
                }}
                disabled={isLoading}
              >
                {["groq", "mistral", "huggingface", "openrouter"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                className="flex-1 h-8 rounded-lg border border-border bg-background px-2 text-xs"
                value={modelBModelId}
                onChange={(e) => setModelBModelId(e.target.value)}
                disabled={isLoading}
              >
                {modelsForB.map((m) => (
                  <option key={m.modelId} value={m.modelId}>{m.label}</option>
                ))}
              </select>
            </div>
            {isLoading && progress.modelB === "generating" && (
              <div className="flex items-center gap-1.5">
                <Spinner className="size-2.5" />
                <span className="text-[10px] text-muted-foreground">Generating...</span>
              </div>
            )}
            {isLoading && progress.modelB === "done" && (
              <span className="text-[10px] text-green-500 flex items-center gap-1">
                <CheckCircle className="size-2.5" /> Done
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="default"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={handleCompare}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner className="size-3" />
            ) : (
              <Play className="size-3" />
            )}
            {isLoading ? "Generating..." : "Compare Models"}
          </Button>
          {status !== "idle" && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetComparison}>
              <ArrowsClockwise className="size-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-xl border border-border p-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Spinner className="size-6" />
            <p className="text-sm text-muted-foreground">Generating reviews from both models...</p>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-primary" />
                {result?.modelA?.label || `${modelAProvider}/${modelAModelId}`}
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {result?.modelB?.label || `${modelBProvider}/${modelBModelId}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <WarningCircle className="size-4" />
            <span className="text-sm font-medium">Comparison Failed</span>
          </div>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={handleCompare}>
            <ArrowsClockwise className="size-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Results */}
      {isDone && result && (
        <div className="space-y-6">
          {/* Speed Comparison */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-4 justify-center text-xs">
              <div className={`flex items-center gap-1.5 ${result.fasterModel === "A" ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                <Lightning className="size-3" />
                {result.modelA.label}: {result.modelA.durationMs}ms
                {result.fasterModel === "A" && (
                  <Badge variant="outline" className="text-[9px] ml-1">Fastest</Badge>
                )}
              </div>
              <ArrowsDownUp className="size-3 text-muted-foreground" />
              <div className={`flex items-center gap-1.5 ${result.fasterModel === "B" ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                <Lightning className="size-3" />
                {result.modelB.label}: {result.modelB.durationMs}ms
                {result.fasterModel === "B" && (
                  <Badge variant="outline" className="text-[9px] ml-1">Fastest</Badge>
                )}
              </div>
              <span className="text-muted-foreground">
                (diff: {(result.speedDiffMs / 1000).toFixed(1)}s)
              </span>
            </div>
          </div>

          {/* Findings Comparison */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Unique to A */}
            <div className="rounded-xl border border-primary/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-2 rounded-full bg-primary" />
                <h4 className="text-xs font-medium uppercase tracking-wider">Unique to {result.modelA.label}</h4>
              </div>
              {result.uniqueToA.length > 0 ? (
                <ul className="space-y-1">
                  {result.uniqueToA.map((finding, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary shrink-0">→</span>
                      <span>{finding.slice(0, 120)}{finding.length > 120 ? "..." : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">No unique findings — both models agreed on everything.</p>
              )}
            </div>

            {/* Unique to B */}
            <div className="rounded-xl border border-emerald-500/30 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-2 rounded-full bg-emerald-500" />
                <h4 className="text-xs font-medium uppercase tracking-wider">Unique to {result.modelB.label}</h4>
              </div>
              {result.uniqueToB.length > 0 ? (
                <ul className="space-y-1">
                  {result.uniqueToB.map((finding, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-emerald-400 shrink-0">→</span>
                      <span>{finding.slice(0, 120)}{finding.length > 120 ? "..." : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">No unique findings — both models agreed on everything.</p>
              )}
            </div>
          </div>

          {/* Common Findings */}
          {result.commonFindings.length > 0 && (
            <div className="rounded-xl border border-blue-500/30 p-5">
              <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle className="size-3 text-blue-400" />
                Shared Findings (both models agreed)
              </h4>
              <ul className="space-y-1">
                {result.commonFindings.map((finding, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-blue-400 shrink-0">✓</span>
                    <span>{finding.slice(0, 150)}{finding.length > 150 ? "..." : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          {/* Side-by-Side Full Reviews */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Model A Full Review */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-primary">{result.modelA.label}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => navigator.clipboard.writeText(result.modelA.text)}
                >
                  <Copy className="size-2.5" />
                  Copy
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4 max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-muted-foreground">
                  {result.modelA.text}
                </pre>
              </div>
            </div>

            {/* Model B Full Review */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-emerald-500">{result.modelB.label}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => navigator.clipboard.writeText(result.modelB.text)}
                >
                  <Copy className="size-2.5" />
                  Copy
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4 max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans text-muted-foreground">
                  {result.modelB.text}
                </pre>
              </div>
            </div>
          </div>

          {/* Compare Again */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => startComparison(
                { repoFullName, title, contextSnippets },
                {
                  modelA: { provider: result.modelA.provider, modelId: result.modelA.modelId, label: result.modelA.label },
                  modelB: { provider: result.modelB.provider, modelId: result.modelB.modelId, label: result.modelB.label },
                }
              )}
            >
              <Play className="size-3" />
              Run Comparison Again
            </Button>
          </div>
        </div>
      )}

      {/* Initial State */}
      {status === "idle" && (
        <div className="rounded-xl border border-dashed border-border p-12">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Select two models and click Compare</p>
            <p className="text-xs text-muted-foreground">
              See how different AI models review the same code side-by-side. Try a quick pair above or pick your own models.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
