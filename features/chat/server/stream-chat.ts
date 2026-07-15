import { streamReview } from "@/features/ai/streaming";
import { getDefaultModel } from "@/features/ai";
import type { UserModelPreference } from "@/features/ai";
import { saveChatMessage } from "./chat-session";
import type { RepoContextChunk } from "./retrieve";

const CHAT_SYSTEM_PROMPT = `You are CodeLens AI, a senior engineer who knows this codebase inside and out.
Answer the user's question using ONLY the provided code context snippets. Be specific: reference file
paths and function/class names from the context. If the context doesn't contain enough information to
answer confidently, say so plainly instead of guessing. Keep answers concise and use markdown code blocks
when quoting code.`;

function buildContextSection(chunks: RepoContextChunk[]): string {
  if (chunks.length === 0) {
    return "(No indexed code context was found for this repository — answer from general knowledge and say so.)";
  }
  return chunks.map((chunk) => `File: ${chunk.filePath}\n${chunk.text}`).join("\n\n---\n\n");
}

function dedupeCitations(chunks: RepoContextChunk[]): RepoContextChunk[] {
  const seen = new Set<string>();
  const result: RepoContextChunk[] = [];
  for (const chunk of chunks) {
    if (seen.has(chunk.filePath)) continue;
    seen.add(chunk.filePath);
    result.push(chunk);
  }
  return result;
}

/**
 * Streams a RAG chat answer as an SSE ReadableStream and persists the
 * assistant's full message (with citations) once the stream completes.
 */
export function streamChatResponse(params: {
  chatSessionId: string;
  question: string;
  contextChunks: RepoContextChunk[];
  modelPreference?: UserModelPreference;
}): ReadableStream {
  const { chatSessionId, question, contextChunks, modelPreference } = params;
  const { provider, modelId } = getDefaultModel(modelPreference);
  const citations = dedupeCitations(contextChunks);

  const generator = streamReview({
    provider,
    modelId,
    system: CHAT_SYSTEM_PROMPT,
    prompt: `Question: ${question}\n\nCode context:\n${buildContextSection(contextChunks)}`,
  });

  let fullText = "";

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      send({ type: "citations", data: citations });

      try {
        for await (const event of generator) {
          if (event.type === "token") {
            fullText += event.data;
          }
          send(event);
        }
      } catch {
        send({ type: "error", data: "Chat stream error" });
      } finally {
        if (fullText.trim().length > 0) {
          await saveChatMessage({
            chatSessionId,
            role: "assistant",
            content: fullText,
            citedChunks: citations,
          });
        }
        controller.close();
      }
    },
  });
}
