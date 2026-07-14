import { generateWithProvider } from "@/features/ai";
import type { AIProvider } from "@/features/ai";

export type ComparisonModel = {
  provider: AIProvider;
  modelId: string;
  label: string;
};

export type ComparisonResult = {
  modelA: {
    provider: AIProvider;
    modelId: string;
    label: string;
    text: string;
    durationMs: number;
  };
  modelB: {
    provider: AIProvider;
    modelId: string;
    label: string;
    text: string;
    durationMs: number;
  };
  /** Which model won on speed */
  fasterModel: "A" | "B";
  /** Speed difference in ms */
  speedDiffMs: number;
  /** Shared findings between both models */
  commonFindings: string[];
  /** Unique to model A */
  uniqueToA: string[];
  /** Unique to model B */
  uniqueToB: string[];
};

const COMPARE_SYSTEM_PROMPT = `You are an expert code reviewer. Review the provided unified diff chunks and write a concise, actionable pull request review in markdown.

Analyze the changes across these dimensions (only mention what's relevant):
- **Correctness** — Bugs, logic errors, off-by-one errors, incorrect assumptions
- **Security** — Injection risks, auth issues, exposed secrets, unsafe deserialization
- **Performance** — Unnecessary loops, missing indexes, N+1 queries, memory leaks
- **Reliability** — Unhandled errors/edge cases, missing null checks, race conditions
- **Readability** — Naming clarity, overly complex logic
- **Maintainability** — Tight coupling, duplication, SOLID/DRY violations

## Output Format
Start with a **one-line summary**. Then use:
### ✅ What looks good
### ⚠️ Suggestions
### 🚨 Issues
If the diff looks clean, say so in 1–2 sentences. Be specific, constructive, and proportional.`;

/**
 * Compare reviews from two different AI models on the same PR.
 * Both reviews are generated in parallel and the results are analyzed
 * for common and unique findings.
 */
export async function compareReviews(
  repoFullName: string,
  title: string,
  contextSnippets: string[],
  modelAConfig: ComparisonModel,
  modelBConfig: ComparisonModel
): Promise<ComparisonResult> {
  const context = contextSnippets.join("\n\n---\n\n");
  const prompt = `Repository: ${repoFullName}\nPull request title: ${title}\nCode changes:\n${context}`;

  // Run both reviews in parallel
  const [resultA, resultB] = await Promise.all([
    timeReview(modelAConfig.provider, modelAConfig.modelId, prompt),
    timeReview(modelBConfig.provider, modelBConfig.modelId, prompt),
  ]);

  const fasterModel = resultA.durationMs <= resultB.durationMs ? "A" : "B";
  const speedDiffMs = Math.abs(resultA.durationMs - resultB.durationMs);

  // Extract sections from each review for comparison
  const findingsA = extractFindings(resultA.text);
  const findingsB = extractFindings(resultB.text);

  // Find common and unique findings
  const common = findingsA.filter((f) =>
    findingsB.some((fb) => similarityScore(f, fb) > 0.3)
  );

  const uniqueToA = findingsA.filter(
    (f) => !findingsB.some((fb) => similarityScore(f, fb) > 0.3)
  );

  const uniqueToB = findingsB.filter(
    (f) => !findingsA.some((fb) => similarityScore(f, fb) > 0.3)
  );

  return {
    modelA: { ...modelAConfig, ...resultA },
    modelB: { ...modelBConfig, ...resultB },
    fasterModel,
    speedDiffMs,
    commonFindings: common,
    uniqueToA,
    uniqueToB,
  };
}

async function timeReview(
  provider: AIProvider,
  modelId: string,
  prompt: string
): Promise<{ text: string; durationMs: number }> {
  const start = Date.now();
  const text = await generateWithProvider({
    provider,
    modelId,
    system: COMPARE_SYSTEM_PROMPT,
    prompt,
  });
  return { text, durationMs: Date.now() - start };
}

/**
 * Extract bullet-point findings from a markdown review.
 * Looks for lines that start with `- ` or `* `.
 */
function extractFindings(text: string): string[] {
  const lines = text.split("\n");
  const findings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match bullet points (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      findings.push(trimmed.replace(/^[-*]\s+/, "").trim());
    }
    // Match numbered lists (1. 2. etc.)
    if (/^\d+\.\s/.test(trimmed)) {
      findings.push(trimmed.replace(/^\d+\.\s+/, "").trim());
    }
  }

  return findings;
}

/**
 * Simple similarity score between two text strings (0-1).
 * Uses word overlap: shared words / total unique words.
 */
function similarityScore(a: string, b: string): number {
  const wordsA = new Set(
    a.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const wordsB = new Set(
    b.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let shared = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) shared++;
  }

  return shared / Math.max(wordsA.size, wordsB.size);
}
