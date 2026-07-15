import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface CliConfig {
  apiKeys: {
    groq?: string;
    mistral?: string;
    huggingface?: string;
    gemini?: string;
    openrouter?: string;
    github?: string;
    [key: string]: string | undefined;
  };
  preferences: {
    defaultProvider?: string;
    defaultModel?: string;
  };
}

const CONFIG_DIR = join(homedir(), ".grokreview");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function getDefaultConfig(): CliConfig {
  return {
    apiKeys: {},
    preferences: {},
  };
}

export function loadConfig(): CliConfig {
  // Read from file
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, "utf-8");
      const config = JSON.parse(raw) as CliConfig;
      // Merge with env vars (env takes precedence)
      config.apiKeys.groq = config.apiKeys.groq || process.env.GROQ_API_KEY;
      config.apiKeys.mistral = config.apiKeys.mistral || process.env.MISTRAL_API_KEY;
      config.apiKeys.huggingface = config.apiKeys.huggingface || process.env.HUGGINGFACE_API_KEY;
      config.apiKeys.gemini = config.apiKeys.gemini || process.env.GEMINI_API_KEY;
      config.apiKeys.openrouter = config.apiKeys.openrouter || process.env.OPENROUTER_API_KEY;
      config.apiKeys.github = config.apiKeys.github || process.env.GITHUB_TOKEN;
      return config;
    }
  } catch {
    // Fall through to defaults
  }

  // Fallback: env vars only
  return {
    apiKeys: {
      groq: process.env.GROQ_API_KEY,
      mistral: process.env.MISTRAL_API_KEY,
      huggingface: process.env.HUGGINGFACE_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
      github: process.env.GITHUB_TOKEN,
    },
    preferences: {},
  };
}

export function saveConfig(config: CliConfig): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error(`Failed to save config to ${CONFIG_PATH}:`, error);
  }
}
