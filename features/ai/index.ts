/**
 * AI Module - Unified interface for multi-provider code review AI.
 * 
 * Supports: OpenRouter, Groq, Mistral, HuggingFace, Ollama (local)
 */

// Provider types and model data
export * from "./types";

// Provider registry (unified model selection)
export {
  getModel,
  getDefaultModel,
  generateWithProvider,
  getConfiguredProviders,
  detectOllamaModels,
  isOllamaRunning,
} from "./registry";

// Direct provider access (for advanced use)
export { getOpenRouterModel } from "./providers/openrouter";
export { getGroqModel } from "./providers/groq";
export { getMistralModel } from "./providers/mistral";
export { getHuggingFaceModel } from "./providers/huggingface";
export { ollamaGenerate, listOllamaModels } from "./providers/ollama";
