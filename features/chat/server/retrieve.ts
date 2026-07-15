import { getPineconeIndex } from "@/features/pinecone/client";

const CONTEXT_RESULTS = 8;

export type RepoContextChunk = {
  filePath: string;
  text: string;
};

/** Retrieves the most relevant synced-codebase chunks for a chat question. */
export async function searchRepoContext(
  namespace: string,
  question: string
): Promise<RepoContextChunk[]> {
  const index = getPineconeIndex();
  const response = await index.namespace(namespace).searchRecords({
    query: { topK: CONTEXT_RESULTS, inputs: { text: question } },
  });

  const chunks: RepoContextChunk[] = [];
  for (const hit of response.result.hits) {
    const fields = hit.fields as { text?: string; filePath?: string };
    if (!fields.text || !fields.filePath) {
      continue;
    }
    chunks.push({ filePath: fields.filePath, text: fields.text });
  }
  return chunks;
}
