import type { LanguageModel } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export type ResolvedModel = {
  model: LanguageModel;
  name: string;
};

/**
 * Resolves an AI SDK model from environment-configured API keys.
 * Priority: explicit provider:model override > Groq > Mistral > HuggingFace > Gemini > OpenRouter.
 */
export function resolveModel(override?: string): ResolvedModel {
  if (override) {
    const [provider, modelId] = override.split(":");
    return createModel(provider, modelId);
  }

  if (process.env.GROQ_API_KEY) {
    return createModel("groq", "llama3-8b-8192");
  }
  if (process.env.MISTRAL_API_KEY) {
    return createModel("mistral", "open-mistral-nemo");
  }
  if (process.env.HUGGINGFACE_API_KEY) {
    return createModel("huggingface", "HuggingFaceH4/zephyr-7b-beta");
  }
  if (process.env.GEMINI_API_KEY) {
    return createModel("gemini", "gemini-2.0-flash");
  }
  if (process.env.OPENROUTER_API_KEY) {
    return createModel("openrouter", "openrouter/free");
  }

  throw new Error(
    "No AI provider configured. Set one of GROQ_API_KEY, MISTRAL_API_KEY, HUGGINGFACE_API_KEY, " +
      "GEMINI_API_KEY, or OPENROUTER_API_KEY in the MCP server's environment."
  );
}

function createModel(provider: string, modelId: string): ResolvedModel {
  switch (provider) {
    case "groq":
      return { model: createGroq({ apiKey: process.env.GROQ_API_KEY })(modelId), name: `groq/${modelId}` };
    case "mistral":
      return { model: createMistral({ apiKey: process.env.MISTRAL_API_KEY })(modelId), name: `mistral/${modelId}` };
    case "huggingface":
      return {
        model: createHuggingFace({ apiKey: process.env.HUGGINGFACE_API_KEY })(modelId),
        name: `huggingface/${modelId}`,
      };
    case "gemini":
      return {
        model: createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })(modelId),
        name: `gemini/${modelId}`,
      };
    case "openrouter":
      return {
        model: createOpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" })(
          modelId
        ),
        name: `openrouter/${modelId}`,
      };
    default:
      throw new Error(`Unknown provider: ${provider}. Use groq, mistral, huggingface, gemini, or openrouter.`);
  }
}
