import { generateWithProvider, getDefaultModel } from "@/features/ai";
import type { UserModelPreference } from "@/features/ai";
import { CHAT_SYSTEM_PROMPT, buildChatPrompt, dedupeCitations } from "./prompt";
import type { RepoContextChunk } from "./retrieve";

export type ChatAnswer = {
  text: string;
  model: string;
  citations: RepoContextChunk[];
};

/**
 * Generates a single, non-streaming RAG chat answer. Used by callers that
 * can't consume an SSE stream — e.g. the API-key-authenticated MCP bridge.
 */
export async function generateChatAnswer(params: {
  question: string;
  contextChunks: RepoContextChunk[];
  modelPreference?: UserModelPreference;
}): Promise<ChatAnswer> {
  const { question, contextChunks, modelPreference } = params;
  const { provider, modelId } = getDefaultModel(modelPreference);
  const citations = dedupeCitations(contextChunks);

  const text = await generateWithProvider({
    provider,
    modelId,
    system: CHAT_SYSTEM_PROMPT,
    prompt: buildChatPrompt(question, contextChunks),
  });

  return { text, model: `${provider}/${modelId}`, citations };
}
