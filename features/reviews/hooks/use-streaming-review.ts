"use client";

import { useState, useCallback, useRef } from "react";
import type { AIProvider } from "@/features/ai";

export type StreamingReviewState = {
  status: "idle" | "connecting" | "streaming" | "done" | "error";
  tokens: string;
  error: string | null;
  provider: AIProvider | null;
  modelId: string | null;
};

export function useStreamingReview() {
  const [state, setState] = useState<StreamingReviewState>({
    status: "idle",
    tokens: "",
    error: null,
    provider: null,
    modelId: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const startReview = useCallback(
    async (params: {
      provider: AIProvider;
      modelId: string;
      repoFullName: string;
      title: string;
      contextSnippets: string[];
      repoContextSnippets?: string[];
    }) => {
      // Abort any previous stream
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const abortController = new AbortController();
      abortRef.current = abortController;

      setState({
        status: "connecting",
        tokens: "",
        error: null,
        provider: params.provider,
        modelId: params.modelId,
      });

      try {
        const response = await fetch("/api/reviews/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: params.provider,
            modelId: params.modelId,
            repoFullName: params.repoFullName,
            title: params.title,
            contextSnippets: params.contextSnippets,
            repoContextSnippets: params.repoContextSnippets ?? [],
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        setState((prev) => ({ ...prev, status: "streaming" }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              
              switch (event.type) {
                case "token":
                  setState((prev) => ({
                    ...prev,
                    tokens: prev.tokens + event.data,
                  }));
                  break;
                case "meta":
                  setState((prev) => ({
                    ...prev,
                    provider: JSON.parse(event.data).provider,
                    modelId: JSON.parse(event.data).modelId,
                  }));
                  break;
                case "error":
                  setState((prev) => ({
                    ...prev,
                    status: "error",
                    error: event.data,
                  }));
                  return;
                case "done":
                  setState((prev) => ({
                    ...prev,
                    status: "done",
                  }));
                  return;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        setState((prev) => ({ ...prev, status: "done" }));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setState((prev) => ({ ...prev, status: "idle" }));
          return;
        }
        setState((prev) => ({
          ...prev,
          status: "error",
          error: error instanceof Error ? error.message : "Stream error",
        }));
      }
    },
    []
  );

  const cancelReview = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState({
      status: "idle",
      tokens: "",
      error: null,
      provider: null,
      modelId: null,
    });
  }, []);

  const resetReview = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState({
      status: "idle",
      tokens: "",
      error: null,
      provider: null,
      modelId: null,
    });
  }, []);

  return {
    ...state,
    startReview,
    cancelReview,
    resetReview,
  };
}
