import { streamReview } from "@/features/ai/streaming";
import { getDefaultModel } from "@/features/ai";
import type { UserModelPreference } from "@/features/ai";
import { saveChatMessage } from "./chat-session";
import type { RepoContextChunk } from "./retrieve";
import { CHAT_SYSTEM_PROMPT, buildChatPrompt, dedupeCitations } from "./prompt";

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
    prompt: buildChatPrompt(question, contextChunks),
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
      } catch (error) {
        console.error("[Chat Stream] Stream failed:", error);
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
