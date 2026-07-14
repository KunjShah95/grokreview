import { generateWithProvider, getDefaultModel } from "@/features/ai";
import type { UserModelPreference } from "@/features/ai";

const SYSTEM_PROMPT = `You are an expert code reviewer with deep knowledge of software engineering best practices, security, and performance optimization.
Review the provided unified diff chunks and write a concise, actionable pull request review in markdown.

## Review Checklist
Analyze the changes across these dimensions (only mention what's relevant):
- **Correctness** — Bugs, logic errors, off-by-one errors, incorrect assumptions
- **Security** — Injection risks, auth issues, exposed secrets, unsafe deserialization, unvalidated input
- **Performance** — Unnecessary loops, missing indexes, N+1 queries, memory leaks
- **Reliability** — Unhandled errors/edge cases, missing null checks, race conditions
- **Readability** — Naming clarity, overly complex logic, missing comments on non-obvious code
- **Maintainability** — Tight coupling, duplication, violations of SOLID/DRY principles

## Output Format
Start with a **one-line summary** of the overall change quality.
Then use this structure if there are findings:
### ✅ What looks good
(skip if nothing notable)
### ⚠️ Suggestions
(non-blocking improvements)
### 🚨 Issues
(bugs, security problems, or breaking changes that should be fixed)

## Guidelines
- Be specific: reference the relevant code, function names, or line context
- Be constructive: explain *why* something is a problem and suggest a fix
- Be proportional: don't nitpick minor style issues if there are real bugs
- If the diff looks clean with no concerns, say so clearly in 1–2 sentences — do not invent problems
- Tailor feedback to the repository language and conventions visible in the diff`;

type ReviewInput = {
  repoFullName: string;
  title: string;
  /** Chunks retrieved from the PR's Pinecone namespace */
  contextSnippets: string[];
  /** Optional chunks from repo-sync namespace (full codebase context) */
  repoContextSnippets: string[];
  /** Optional model preference override */
  modelPreference?: UserModelPreference;
};

function buildRepoContextSection(repoContextSnippets: string[]) {
  if (repoContextSnippets.length === 0) {
    return "";
  }
  const repoContext = repoContextSnippets.join("\n\n---\n\n");
  return `
Related code from the repository (for context only, not part of the change):
${repoContext}`;
}

/**
 * Result of a review generation, including which model was used.
 */
export type ReviewResult = {
  text: string;
  model: string; // e.g. "groq/llama3-70b-8192"
};

/**
 * Generate an AI-powered code review for a pull request.
 * Uses the configured AI provider/model, falling back to defaults.
 */
export async function generateReview(input: ReviewInput): Promise<ReviewResult> {
  const context = input.contextSnippets.join("\n\n---\n\n");
  const repoContextSection = buildRepoContextSection(input.repoContextSnippets);

  // Select the best available model
  const { provider, modelId } = getDefaultModel(input.modelPreference);

  const prompt = `Repository: ${input.repoFullName}
Pull request title: ${input.title}
Code changes:
${context}${repoContextSection}`;

  const buildResult = (text: string, p: string, m: string): ReviewResult => ({
    text,
    model: `${p}/${m}`,
  });

  try {
    const text = await generateWithProvider({
      provider,
      modelId,
      system: SYSTEM_PROMPT,
      prompt,
    });
    return buildResult(text, provider, modelId);
  } catch (error) {
    // If the primary model fails, try OpenRouter as fallback
    console.warn(`Model ${provider}/${modelId} failed:`, error);
    
    if (provider !== "openrouter" && process.env.OPENROUTER_API_KEY) {
      console.log("Falling back to OpenRouter...");
      const text = await generateWithProvider({
        provider: "openrouter",
        modelId: "openrouter/free",
        system: SYSTEM_PROMPT,
        prompt,
      });
      return buildResult(text, "openrouter", "openrouter/free");
    }
    
    throw new Error(`All AI providers failed for review. Last error: ${error}`);
  }
}
