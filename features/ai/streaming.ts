/**
 * Streaming AI Provider - Real-time review generation via Server-Sent Events.
 * 
 * Wraps all AI providers to support streaming output so users see reviews
 * appear token-by-token in the UI instead of waiting for the full response.
 */

import { streamText } from "ai";
import type { AIProvider } from "./types";
import { getModel } from "./registry";
import { isOllamaRunning } from "./providers/ollama";

export type StreamEvent = {
  type: "token" | "error" | "done" | "meta";
  data: string;
};

/**
 * Generate a streaming review using the specified provider/model.
 * Returns an async generator that yields tokens as they arrive.
 */
export async function* streamReview(
  params: {
    provider: AIProvider;
    modelId: string;
    system: string;
    prompt: string;
  }
): AsyncGenerator<StreamEvent> {
  const { provider, modelId, system, prompt } = params;

  try {
    // Yield meta event with provider info
    yield { type: "meta", data: JSON.stringify({ provider, modelId }) };

    if (provider === "ollama") {
      // Ollama streaming via direct HTTP with SSE
      const ollamaRunning = await isOllamaRunning();
      if (!ollamaRunning) {
        yield { type: "error", data: "Ollama is not running. Please start Ollama and try again." };
        return;
      }

      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          prompt: `${system}\n\n${prompt}`,
          stream: true,
        }),
      });

      if (!response.ok) {
        yield { type: "error", data: `Ollama error: ${response.statusText}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: "error", data: "Failed to read Ollama stream" };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              yield { type: "token", data: parsed.response };
            }
            if (parsed.done) {
              yield { type: "done", data: "" };
              return;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      yield { type: "done", data: "" };
    } else {
      // AI SDK providers with streaming
      const model = getModel(provider, modelId);
      
      const result = streamText({
        model,
        system,
        prompt,
      });

      for await (const chunk of result.textStream) {
        yield { type: "token", data: chunk };
      }

      yield { type: "done", data: "" };
    }
  } catch (error) {
    yield {
      type: "error",
      data: error instanceof Error ? error.message : "Unknown streaming error",
    };
  }
}

/**
 * Generate a streaming review as a ReadableStream for use in SSE API endpoints.
 * This converts the async generator into a web-compatible ReadableStream.
 */
export function streamReviewToReadableStream(
  params: {
    provider: AIProvider;
    modelId: string;
    system: string;
    prompt: string;
  }
): ReadableStream {
  const generator = streamReview(params);

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          const line = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(line));
        }
      } catch {
        const errorEvent = `data: ${JSON.stringify({ type: "error", data: "Stream error" })}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });
}
