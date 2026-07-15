/**
 * POST /api/reviews/stream
 *
 * Server-Sent Events endpoint for streaming AI code reviews in real-time.
 * Users see review text appear token-by-token as the AI generates it.
 *
 * Body: {
 *   provider: "groq" | "mistral" | "huggingface" | "gemini" | "openrouter" | "ollama",
 *   modelId: string,
 *   repoFullName: string,
 *   title: string,
 *   contextSnippets: string[],
 *   repoContextSnippets: string[]
 * }
 *
 * Response: SSE stream with data: {"type":"token","data":"..."} events
 */

import { streamReviewToReadableStream } from "@/features/ai/streaming";
import type { AIProvider } from "@/features/ai";

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
- If the diff looks clean with no concerns, say so clearly in 1–2 sentences — do not invent problems`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      provider,
      modelId,
      repoFullName,
      title,
      contextSnippets,
      repoContextSnippets,
    } = body;

    // Validate required fields
    if (!provider || !modelId || !repoFullName || !title || !contextSnippets) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate provider
    const validProviders = ["groq", "mistral", "huggingface", "gemini", "openrouter", "ollama"];
    if (!validProviders.includes(provider)) {
      return new Response(
        JSON.stringify({ error: `Invalid provider: ${provider}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build context
    const context = contextSnippets.join("\n\n---\n\n");
    const repoContext = (repoContextSnippets || []).join("\n\n---\n\n");
    const repoContextSection = repoContext
      ? `\nRelated code from the repository (for context only, not part of the change):\n${repoContext}`
      : "";

    const prompt = `Repository: ${repoFullName}
Pull request title: ${title}
Code changes:
${context}${repoContextSection}`;

    // Create the SSE ReadableStream
    const stream = streamReviewToReadableStream({
      provider: provider as AIProvider,
      modelId,
      system: SYSTEM_PROMPT,
      prompt,
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Stream error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
