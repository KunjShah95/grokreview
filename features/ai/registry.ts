/**
 * AI Provider Registry - Unified interface for all supported AI providers.
 * 
 * Supports: OpenRouter, Groq, Mistral, HuggingFace, Ollama (local)
 * Usage: const model = getModel("groq", "llama3-70b-8192");
 *        const { text } = await generateText({ model, prompt: "..." });
 */

import { generateText } from "ai";
import type { AIProvider, UserModelPreference } from "./types";
import { DEFAULT_MODEL } from "./types";
import { getOpenRouterModel } from "./providers/openrouter";
import { getGroqModel } from "./providers/groq";
import { getMistralModel } from "./providers/mistral";
import { getHuggingFaceModel } from "./providers/huggingface";
import { getGeminiModel } from "./providers/gemini";
import { ollamaGenerate, isOllamaRunning, detectOllamaModels } from "./providers/ollama";

export { detectOllamaModels, isOllamaRunning };

/**
 * Get a LanguageModelV1 instance for the specified provider and model.
 * For Ollama, returns a lightweight adapter since it uses direct HTTP.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModel(provider: AIProvider, modelId: string): any {
  switch (provider) {
    case "openrouter":
      return getOpenRouterModel(modelId);
    case "groq":
      return getGroqModel(modelId);
    case "mistral":
      return getMistralModel(modelId);
    case "huggingface":
      return getHuggingFaceModel(modelId);
    case "gemini":
      return getGeminiModel(modelId);
    case "ollama":
      // Ollama uses a custom adapter that wraps the LanguageModelV1 interface
      return createOllamaModelAdapter(modelId);
    default:
      console.warn(`Unknown provider "${provider}", falling back to OpenRouter`);
      return getOpenRouterModel(modelId);
  }
}

/**
 * Get the default model based on user preference or environment config.
 * Priority: User preference > GROQ_API_KEY > OPENROUTER_API_KEY > Default
 */
export function getDefaultModel(preference?: UserModelPreference): { provider: AIProvider; modelId: string } {
  if (preference) {
    return { provider: preference.provider, modelId: preference.modelId };
  }

  // Auto-detect best available provider
  if (process.env.GROQ_API_KEY) {
    return { provider: "groq", modelId: "llama3-8b-8192" };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return { provider: "openrouter", modelId: "openrouter/free" };
  }
  if (process.env.MISTRAL_API_KEY) {
    return { provider: "mistral", modelId: "open-mistral-nemo" };
  }
  if (process.env.HUGGINGFACE_API_KEY) {
    return { provider: "huggingface", modelId: "HuggingFaceH4/zephyr-7b-beta" };
  }
  if (process.env.GEMINI_API_KEY) {
    return { provider: "gemini", modelId: "gemini-2.0-flash" };
  }

  return { provider: (DEFAULT_MODEL?.provider || "openrouter"), modelId: (DEFAULT_MODEL?.modelId || "openrouter/free") };
}

/**
 * Generate text with the specified provider and model.
 * Unified wrapper that handles Ollama's direct HTTP API differently.
 */
export async function generateWithProvider(
  params: {
    provider: AIProvider;
    modelId: string;
    system: string;
    prompt: string;
  }
): Promise<string> {
  const { provider, modelId, system, prompt } = params;

  // Ollama uses direct HTTP API
  if (provider === "ollama") {
    const ollamaRunning = await isOllamaRunning();
    if (!ollamaRunning) {
      throw new Error("Ollama is not running. Please start Ollama and try again.");
    }
    return ollamaGenerate(modelId, prompt, system);
  }

  // All other providers use the AI SDK
  const model = getModel(provider, modelId);
  const { text } = await generateText({
    model,
    system,
    prompt,
  });
  return text;
}

/**
 * Check which providers are configured (have API keys set).
 */
export function getConfiguredProviders(): Array<{ provider: AIProvider; label: string; configured: boolean }> {
  return [
    { provider: "openrouter", label: "OpenRouter", configured: !!process.env.OPENROUTER_API_KEY },
    { provider: "groq", label: "Groq", configured: !!process.env.GROQ_API_KEY },
    { provider: "mistral", label: "Mistral", configured: !!process.env.MISTRAL_API_KEY },
    { provider: "huggingface", label: "HuggingFace", configured: !!process.env.HUGGINGFACE_API_KEY },
    { provider: "gemini", label: "Gemini", configured: !!process.env.GEMINI_API_KEY },
    { provider: "ollama", label: "Ollama (Local)", configured: true }, // Always available, runtime check
  ];
}

// --- Ollama Adapter ---

/**
 * Creates a lightweight LanguageModelV1 adapter for Ollama.
 * This allows Ollama to be used with the AI SDK's generateText() interface.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createOllamaModelAdapter(modelId: string): any {
  return {
    specificationVersion: "v1",
    provider: "ollama",
    modelId,
    defaultObjectGenerationMode: "json",
    
    async doGenerate(options: {
      prompt: Array<{ role: string; content: Array<{ type: string; text?: string }> }>;
      temperature?: number;
      maxTokens?: number;
    }) {
      // Extract the last user message
      const lastUserMsg = [...options.prompt].reverse().find(
        p => p.role === "user"
      );
      const systemMsg = options.prompt.find(p => p.role === "system");
      
      const userText = lastUserMsg?.content
        .filter(c => c.type === "text")
        .map(c => c.text)
        .join("\n") || "";
      
      const systemText = systemMsg?.content
        .filter(c => c.type === "text")
        .map(c => c.text)
        .join("\n") || "";

      const response = await ollamaGenerate(modelId, userText, systemText);

      return {
        text: response,
        finishReason: "stop",
        usage: { promptTokens: 0, completionTokens: 0 },
        rawCall: { rawPrompt: options.prompt, rawSettings: {} },
      };
    },
  };
}
