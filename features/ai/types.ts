/**
 * Unified AI provider types for the multi-model PR review system.
 * Supports OpenRouter, Groq, Mistral, HuggingFace, and Ollama.
 */

export type AIProvider = 
  | "openrouter"
  | "groq" 
  | "mistral" 
  | "huggingface" 
  | "ollama";

export interface AIModel {
  /** Provider identifier */
  provider: AIProvider;
  /** Model name/path as required by the provider API */
  modelId: string;
  /** Human-readable display name */
  label: string;
  /** Whether this model is free */
  isFree: boolean;
  /** Provider-specific configuration */
  config?: Record<string, string | number | boolean>;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  /** For Ollama: auto-detect local instance */
  autoDetect?: boolean;
}

export const DEFAULT_FREE_MODEL: AIModel = {
  provider: "openrouter",
  modelId: "openrouter/free",
  label: "OpenRouter Free",
  isFree: true,
};

export const AVAILABLE_MODELS: AIModel[] = [
  // OpenRouter models (gateway to many free models)
  { provider: "openrouter", modelId: "openrouter/free", label: "OpenRouter Free (GPT-3.5/Gemma/Mixtral)", isFree: true },
  { provider: "openrouter", modelId: "openrouter/auto", label: "OpenRouter Auto (Best available)", isFree: false },
  
  // Groq models (extremely fast inference)
  { provider: "groq", modelId: "llama3-70b-8192", label: "Llama 3 70B (Groq)", isFree: true },
  { provider: "groq", modelId: "llama3-8b-8192", label: "Llama 3 8B (Groq)", isFree: true },
  { provider: "groq", modelId: "mixtral-8x7b-32768", label: "Mixtral 8x7B (Groq)", isFree: true },
  { provider: "groq", modelId: "gemma2-9b-it", label: "Gemma 2 9B (Groq)", isFree: true },
  { provider: "groq", modelId: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 70B (Groq)", isFree: true },
  
  // Mistral models
  { provider: "mistral", modelId: "mistral-large-latest", label: "Mistral Large", isFree: false },
  { provider: "mistral", modelId: "mistral-small-latest", label: "Mistral Small", isFree: true },
  { provider: "mistral", modelId: "open-mistral-nemo", label: "Mistral Nemo", isFree: true },
  { provider: "mistral", modelId: "codestral-latest", label: "Codestral (Code)", isFree: true },
  
  // HuggingFace models (free inference API)
  { provider: "huggingface", modelId: "HuggingFaceH4/zephyr-7b-beta", label: "Zephyr 7B (HF)", isFree: true },
  { provider: "huggingface", modelId: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B Instruct (HF)", isFree: true },
  { provider: "huggingface", modelId: "meta-llama/Llama-3.2-3B-Instruct", label: "Llama 3.2 3B (HF)", isFree: true },
  { provider: "huggingface", modelId: "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B", label: "DeepSeek R1 1.5B (HF)", isFree: true },

  // Ollama models (local, detected dynamically)
  { provider: "ollama", modelId: "llama3.2", label: "Llama 3.2 (Local Ollama)", isFree: true },
  { provider: "ollama", modelId: "llama3.1", label: "Llama 3.1 (Local Ollama)", isFree: true },
  { provider: "ollama", modelId: "mistral", label: "Mistral (Local Ollama)", isFree: true },
  { provider: "ollama", modelId: "codellama", label: "CodeLlama (Local Ollama)", isFree: true },
  { provider: "ollama", modelId: "deepseek-coder", label: "DeepSeek Coder (Local Ollama)", isFree: true },
  { provider: "ollama", modelId: "phi3", label: "Phi-3 (Local Ollama)", isFree: true },
  { provider: "ollama", modelId: "qwen2.5-coder", label: "Qwen 2.5 Coder (Local Ollama)", isFree: true },
];

/** Default model to use when none is configured */
export const DEFAULT_MODEL_ID = "groq";
export const DEFAULT_MODEL = AVAILABLE_MODELS.find(m => m.modelId === "llama3-8b-8192") || DEFAULT_FREE_MODEL;

/** Maximum user preference (stored in DB) */
export interface UserModelPreference {
  provider: AIProvider;
  modelId: string;
}
