/**
 * POST /api/reviews/compare
 *
 * Generates two AI reviews in parallel using different models and returns
 * a side-by-side comparison with common and unique findings.
 *
 * Body: {
 *   repoFullName: string,
 *   title: string,
 *   contextSnippets: string[],
 *   modelA: { provider, modelId, label },
 *   modelB: { provider, modelId, label }
 * }
 *
 * Response: ComparisonResult with both reviews, speed comparison,
 * common/unique findings analysis.
 */

import { compareReviews } from "@/features/reviews/server/compare-review";
import type { AIProvider } from "@/features/ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repoFullName, title, contextSnippets, modelA, modelB } = body;

    // Validate required fields
    if (!repoFullName || !title || !contextSnippets || !modelA || !modelB) {
      return NextResponse.json(
        { error: "Missing required fields: repoFullName, title, contextSnippets, modelA, modelB" },
        { status: 400 }
      );
    }

    // Validate model configs
    if (!modelA.provider || !modelA.modelId || !modelB.provider || !modelB.modelId) {
      return NextResponse.json(
        { error: "Each model must have a provider and modelId" },
        { status: 400 }
      );
    }

    const validProviders = ["groq", "mistral", "huggingface", "openrouter", "ollama"];
    if (!validProviders.includes(modelA.provider) || !validProviders.includes(modelB.provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Valid: groq, mistral, huggingface, openrouter, ollama" },
        { status: 400 }
      );
    }

    // Run comparison
    const result = await compareReviews(
      repoFullName,
      title,
      contextSnippets,
      {
        provider: modelA.provider as AIProvider,
        modelId: modelA.modelId,
        label: modelA.label || `${modelA.provider}/${modelA.modelId}`,
      },
      {
        provider: modelB.provider as AIProvider,
        modelId: modelB.modelId,
        label: modelB.label || `${modelB.provider}/${modelB.modelId}`,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Comparison error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        status: "failed",
      },
      { status: 500 }
    );
  }
}
