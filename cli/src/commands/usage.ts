import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, saveConfig, type CliConfig } from "../utils/config.js";
import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

interface LocalUsage {
  totalReviews: number;
  reviewsByProvider: Record<string, number>;
  monthlyUsage: Array<{ month: string; count: number }>;
  lastReset: string;
}

const USAGE_PATH = join(homedir(), ".grokreview", "usage.json");

function loadLocalUsage(): LocalUsage {
  try {
    if (existsSync(USAGE_PATH)) {
      return JSON.parse(readFileSync(USAGE_PATH, "utf-8"));
    }
  } catch {
    // fall through
  }
  return {
    totalReviews: 0,
    reviewsByProvider: {},
    monthlyUsage: [],
    lastReset: new Date().toISOString(),
  };
}

function saveLocalUsage(usage: LocalUsage) {
  const dir = join(homedir(), ".grokreview");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(USAGE_PATH, JSON.stringify(usage, null, 2));
}

/**
 * Track a review in local usage stats.
 * Called by the review command after a successful review.
 */
export function trackReview(provider: string, modelId: string) {
  const usage = loadLocalUsage();

  usage.totalReviews++;
  usage.reviewsByProvider[provider] = (usage.reviewsByProvider[provider] || 0) + 1;

  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-07"
  const monthEntry = usage.monthlyUsage.find((m) => m.month === currentMonth);
  if (monthEntry) {
    monthEntry.count++;
  } else {
    usage.monthlyUsage.push({ month: currentMonth, count: 1 });
  }

  saveLocalUsage(usage);
}

export const usageCommand = new Command("usage")
  .description("Show local usage statistics and limits")
  .option("--reset", "Reset local usage tracking data")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    if (options.reset) {
      saveLocalUsage({
        totalReviews: 0,
        reviewsByProvider: {},
        monthlyUsage: [],
        lastReset: new Date().toISOString(),
      });
      console.log(chalk.green("  ✓ Usage tracking data reset.\n"));
      return;
    }

    const config = loadConfig();
    const usage = loadLocalUsage();

    // Determine if user has API keys configured
    const hasKeys = Object.entries(config.apiKeys).filter(([, v]) => v).length;

    if (options.json) {
      console.log(JSON.stringify({ config: { apiKeysConfigured: hasKeys }, usage }, null, 2));
      return;
    }

    console.log(chalk.bold("\n  📊 Usage Statistics\n"));

    // API Keys Status
    console.log(chalk.cyan("  API Keys:"));
    const keyEntries = [
      ["Groq", config.apiKeys.groq],
      ["Mistral", config.apiKeys.mistral],
      ["HuggingFace", config.apiKeys.huggingface],
      ["Gemini", config.apiKeys.gemini],
      ["OpenRouter", config.apiKeys.openrouter],
    ];
    for (const [name, key] of keyEntries) {
      const status = key
        ? chalk.green("✓ configured")
        : chalk.dim("not set — free tier limited");
      console.log(`    ${chalk.dim("•")} ${name}: ${status}`);
    }
    console.log();

    // Local Usage
    console.log(chalk.cyan("  Local Usage (this machine):"));
    console.log(`    ${chalk.dim("•")} Total CLI reviews: ${chalk.bold(String(usage.totalReviews))}`);
    console.log(`    ${chalk.dim("•")} Current month: ${chalk.bold(String(usage.monthlyUsage.find((m) => m.month === new Date().toISOString().slice(0, 7))?.count || 0))}`);

    if (Object.keys(usage.reviewsByProvider).length > 0) {
      console.log(chalk.dim("\n    By provider:"));
      for (const [provider, count] of Object.entries(usage.reviewsByProvider)) {
        console.log(`      ${chalk.dim("→")} ${provider}: ${count}`);
      }
    }
    console.log();

    // Estimated Limits
    console.log(chalk.cyan("  Estimated Limits:"));
    console.log(`    ${chalk.dim("•")} Free tier: ${chalk.yellow("5 reviews/month")} (via GrokReview web app)`);
    console.log(`    ${chalk.dim("•")} CLI: ${chalk.green("No limit")} (uses your own API keys)`);
    console.log(`    ${chalk.dim("•")} Data file: ${chalk.dim(USAGE_PATH)}\n`);

    // Tips
    console.log(chalk.dim("  💡 Tips:"));
    console.log(`    ${chalk.dim("•")} Usage tracking resets monthly in the web app`);
    console.log(`    ${chalk.dim("•")} Use --model flag to choose cheaper models: pr-review review ... -m groq:llama3-8b-8192`);
    console.log(`    ${chalk.dim("•")} Check web dashboard for detailed analytics and heatmap\n`);
  });
