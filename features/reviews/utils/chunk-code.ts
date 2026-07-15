import type { CodeChunk, PrFile } from "@/features/reviews/types/review";

// Deliberately NOT using AST-based chunking (see features/reviews/utils/ast-chunk.ts,
// used by repo-sync's chunkRepoFiles) here: `file.patch` is a unified diff hunk, not
// standalone valid source — it's often a disconnected fragment of the real file (only
// the changed lines plus a few lines of surrounding context), so parsing it as if it
// were complete syntax would produce unreliable boundaries. Full-file content (as
// repo-sync has) is where AST-aware chunking is trustworthy; diffs stay line-windowed.
const MAX_CHUNK_LINES = 80;

function buildChunkId(prNumber: number, filePath: string, part: number) {
  return `pr-${prNumber}--${filePath}--part-${part}`;
}

export function chunkPrFiles(prNumber: number, files: PrFile[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const lines = file.patch.split("\n");
    // Slide a fixed-size window across the diff; large files produce many chunks
    for (let start = 0; start < lines.length; start += MAX_CHUNK_LINES) {
      const part = start / MAX_CHUNK_LINES;
      const text = lines.slice(start, start + MAX_CHUNK_LINES).join("\n");
      chunks.push({
        id: buildChunkId(prNumber, file.filePath, part),
        filePath: file.filePath,
        text,
      });
    }
  }

  return chunks;
}
