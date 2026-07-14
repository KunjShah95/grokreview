import { Command } from "commander";
import chalk from "chalk";

interface ModelEntry {
  provider: string;
  modelId: string;
  label: string;
  free: boolean;
}

const ALL_MODELS: ModelEntry[] = [
  // Groq
  { provider: "Groq", modelId: "llama3-70b-8192", label: "Llama 3 70B", free: true },
  { provider: "Groq", modelId: "llama3-8b-8192", label: "Llama 3 8B", free: true },
  { provider: "Groq", modelId: "mixtral-8x7b-32768", label: "Mixtral 8x7B", free: true },
  { provider: "Groq", modelId: "gemma2-9b-it", label: "Gemma 2 9B", free: true },
  { provider: "Groq", modelId: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 70B", free: true },
  // Mistral
  { provider: "Mistral", modelId: "mistral-large-latest", label: "Mistral Large", free: false },
  { provider: "Mistral", modelId: "open-mistral-nemo", label: "Mistral Nemo", free: true },
  { provider: "Mistral", modelId: "codestral-latest", label: "Codestral", free: true },
  // HuggingFace
  { provider: "HuggingFace", modelId: "HuggingFaceH4/zephyr-7b-beta", label: "Zephyr 7B", free: true },
  { provider: "HuggingFace", modelId: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B Instruct", free: true },
  { provider: "HuggingFace", modelId: "meta-llama/Llama-3.2-3B-Instruct", label: "Llama 3.2 3B", free: true },
  // OpenRouter
  { provider: "OpenRouter", modelId: "openrouter/free", label: "Free tier", free: true },
  { provider: "OpenRouter", modelId: "openrouter/auto", label: "Best available", free: false },
  // Ollama (local)
  { provider: "Ollama", modelId: "llama3.2", label: "Llama 3.2", free: true },
  { provider: "Ollama", modelId: "mistral", label: "Mistral", free: true },
  { provider: "Ollama", modelId: "codellama", label: "CodeLlama", free: true },
  { provider: "Ollama", modelId: "deepseek-coder", label: "DeepSeek Coder", free: true },
  { provider: "Ollama", modelId: "qwen2.5-coder", label: "Qwen 2.5 Coder", free: true },
];

export const modelsCommand = new Command("models")
  .description("List available AI models and detect local Ollama models")
  .option("-l, --local", "Only show local Ollama models")
  .action(async (options) => {
    if (options.local) {
      console.log(chalk.bold("\n  🔍 Checking for local Ollama models...\n"));
      try {
        const response = await fetch("http://localhost:11434/api/tags", {
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          const data = await response.json() as { models?: Array<{ name: string; size: number }> };
          if (data.models && data.models.length > 0) {
            for (const model of data.models) {
              const sizeGB = (model.size / 1_000_000_000).toFixed(1);
              console.log(`  ${chalk.green("✓")} ${chalk.cyan(model.name)} ${chalk.dim(`(${sizeGB}GB)`)}`);
            }
          } else {
            console.log(chalk.yellow("  No Ollama models found. Pull one with: ollama pull llama3.2"));
          }
        } else {
          console.log(chalk.red("  ✗ Ollama is not running. Start it with: ollama serve"));
        }
      } catch {
        console.log(chalk.red("  ✗ Could not connect to Ollama. Is it running?"));
      }
      return;
    }

    // Group by provider
    const grouped = new Map<string, ModelEntry[]>();
    for (const model of ALL_MODELS) {
      if (!grouped.has(model.provider)) grouped.set(model.provider, []);
      grouped.get(model.provider)!.push(model);
    }

    console.log(chalk.bold("\n  📋 Available AI Models\n"));

    for (const [provider, models] of grouped) {
      console.log(chalk.cyan(`  ${provider}:`));
      for (const model of models) {
        const free = model.free ? chalk.green(" FREE") : chalk.yellow(" PAID");
        console.log(`    ${chalk.dim("→")} ${model.modelId} ${chalk.dim(`(${model.label})`)} ${free}`);
      }
      console.log();
    }

    console.log(chalk.dim("  Usage: pr-review review owner/repo#42 --model groq:llama3-70b-8192\n"));
  });
