import type { RepoContextChunk } from "./retrieve";

export const CHAT_SYSTEM_PROMPT = `You are CodeLens AI, a senior engineer who knows this codebase inside and out.
Answer the user's question using ONLY the provided code context snippets. Be specific: reference file
paths and function/class names from the context. If the context doesn't contain enough information to
answer confidently, say so plainly instead of guessing. Keep answers concise and use markdown code blocks
when quoting code.`;

export function buildContextSection(chunks: RepoContextChunk[]): string {
  if (chunks.length === 0) {
    return "(No indexed code context was found for this repository — answer from general knowledge and say so.)";
  }
  return chunks.map((chunk) => `File: ${chunk.filePath}\n${chunk.text}`).join("\n\n---\n\n");
}

export function buildChatPrompt(question: string, chunks: RepoContextChunk[]): string {
  return `Question: ${question}\n\nCode context:\n${buildContextSection(chunks)}`;
}

export function dedupeCitations(chunks: RepoContextChunk[]): RepoContextChunk[] {
  const seen = new Set<string>();
  const result: RepoContextChunk[] = [];
  for (const chunk of chunks) {
    if (seen.has(chunk.filePath)) continue;
    seen.add(chunk.filePath);
    result.push(chunk);
  }
  return result;
}
