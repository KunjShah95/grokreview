"use client";

import { useState, useCallback } from "react";
import type { AIProvider } from "@/features/ai";
import type { ComparisonResult } from "@/features/reviews/server/compare-review";

export type ComparisonState = {
  status: "idle" | "loading" | "done" | "error";
  result: ComparisonResult | null;
  error: string | null;
  progress: {
    modelA: "pending" | "generating" | "done" | "error";
    modelB: "pending" | "generating" | "done" | "error";
  };
};

export type CompareModelsConfig = {
  modelA: { provider: AIProvider; modelId: string; label?: string };
  modelB: { provider: AIProvider; modelId: string; label?: string };
};

export function useModelComparison() {
  const [state, setState] = useState<ComparisonState>({
    status: "idle",
    result: null,
    error: null,
    progress: {
      modelA: "pending",
      modelB: "pending",
    },
  });

  const startComparison = useCallback(
    async (
      params: {
        repoFullName: string;
        title: string;
        contextSnippets: string[];
      },
      models: CompareModelsConfig
    ) => {
      setState({
        status: "loading",
        result: null,
        error: null,
        progress: {
          modelA: "generating",
          modelB: "generating",
        },
      });

      try {
        const response = await fetch("/api/reviews/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            modelA: {
              provider: models.modelA.provider,
              modelId: models.modelA.modelId,
              label: models.modelA.label || `${models.modelA.provider}/${models.modelA.modelId}`,
            },
            modelB: {
              provider: models.modelB.provider,
              modelId: models.modelB.modelId,
              label: models.modelB.label || `${models.modelB.provider}/${models.modelB.modelId}`,
            },
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error || `Server error: ${response.status}`);
        }

        const result: ComparisonResult = await response.json();

        setState({
          status: "done",
          result,
          error: null,
          progress: {
            modelA: result.modelA.text ? "done" : "error",
            modelB: result.modelB.text ? "done" : "error",
          },
        });
      } catch (error) {
        setState({
          status: "error",
          result: null,
          error: error instanceof Error ? error.message : "Comparison failed",
          progress: {
            modelA: "error",
            modelB: "error",
          },
        });
      }
    },
    []
  );

  const resetComparison = useCallback(() => {
    setState({
      status: "idle",
      result: null,
      error: null,
      progress: {
        modelA: "pending",
        modelB: "pending",
      },
    });
  }, []);

  return {
    ...state,
    startComparison,
    resetComparison,
  };
}
