import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { Octokit } from "octokit";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { createOpenAI } from "@ai-sdk/openai";
import { loadConfig, type CliConfig } from "../utils/config.js";
import { trackReview } from "./usage.js";

const SYSTEM_PROMPT = `You are an expert code reviewer. Review the provided unified diff and write a concise, actionable pull request review in markdown.
Analyze: correctness, security, performance, reliability, readability, and maintainability.
Start with a one-line summary, then use sections: ✅ What looks good, ⚠️ Suggestions, 🚨 Issues.
Be specific, constructive, and proportional.`;

async function getDiff(octokit: Octokit, owner: string, repo: string, prNumber: number): Promise<string> {
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: "diff" },
  });
  // Truncate to avoid hitting token limits
  const diff = data as unknown as string;
  return diff.length > 50000 ? diff.slice(0, 50000) + "\n\n...(truncated)" : diff;
}

async function getPrInfo(octokit: Octokit, owner: string, repo: string, prNumber: number) {
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    owner,
    repo,
    pull_number: prNumber,
  });
  return { title: data.title, author: data.user?.login || "unknown" };
}

function getModel(config: CliConfig, modelArg?: string) {
  // If user specified a model like "groq:llama3-70b-8192" or just "groq"
  if (modelArg) {
    const parts = modelArg.split(":");
    const provider = parts[0].toLowerCase();
    const modelId = parts[1] || "llama3-8b-8192";
    return { provider, modelId };
  }

  // Use config or defaults
  const prefs = config.preferences;
  if (prefs?.defaultProvider && prefs?.defaultModel) {
    return { provider: prefs.defaultProvider, modelId: prefs.defaultModel };
  }

  // Auto-detect
  if (config.apiKeys.groq) return { provider: "groq", modelId: "llama3-8b-8192" };
  if (config.apiKeys.mistral) return { provider: "mistral", modelId: "open-mistral-nemo" };
  if (config.apiKeys.huggingface) return { provider: "huggingface", modelId: "HuggingFaceH4/zephyr-7b-beta" };
  if (config.apiKeys.openrouter) return { provider: "openrouter", modelId: "openrouter/free" };

  throw new Error(
    "No AI provider configured.\n" +
    "Run: pr-review config set GROQ_API_KEY <key>\n" +
    "Or set environment variables: GROQ_API_KEY, MISTRAL_API_KEY, etc."
  );
}

function createModel(provider: string, modelId: string, config: CliConfig) {
  switch (provider) {
    case "groq":
      return { model: createGroq({ apiKey: config.apiKeys.groq })(modelId), name: `${provider}/${modelId}` };
    case "mistral":
      return { model: createMistral({ apiKey: config.apiKeys.mistral })(modelId), name: `${provider}/${modelId}` };
    case "huggingface":
      return { model: createHuggingFace({ apiKey: config.apiKeys.huggingface })(modelId), name: `${provider}/${modelId}` };
    case "openrouter":
      return { model: createOpenAI({ apiKey: config.apiKeys.openrouter, baseURL: "https://openrouter.ai/api/v1" })(modelId), name: `${provider}/${modelId}` };
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export const reviewCommand = new Command("review")
  .description("Review a GitHub pull request using AI")
  .argument("[pr-ref]", "PR reference (e.g. owner/repo#42)")
  .option("-p, --pr <number>", "Pull request number")
  .option("-r, --repo <name>", "Repository full name (e.g. owner/repo)")
  .option("-m, --model <name>", "AI model (e.g. groq:llama3-70b, mistral:mistral-large)")
  .option("-t, --token <token>", "GitHub personal access token (or GITHUB_TOKEN env)")
  .action(async (prRef, options) => {
    const config = loadConfig();

    // Parse PR reference
    let owner = "";
    let repo = "";
    let prNumber = 0;

    if (prRef) {
      const match = prRef.match(/^([^/]+)\/([^#]+)#(\d+)$/);
      if (!match) {
        console.error(chalk.red("Invalid PR reference. Use format: owner/repo#42"));
        process.exit(1);
      }
      const [, matchedOwner, matchedRepo, matchedPrStr] = match;
      owner = matchedOwner;
      repo = matchedRepo;
      prNumber = parseInt(matchedPrStr);
    } else if (options.pr && options.repo) {
      const match = options.repo.match(/^([^/]+)\/(.+)$/);
      if (!match) {
        console.error(chalk.red("Invalid repo format. Use: owner/repo"));
        process.exit(1);
      }
      [, owner, repo] = match;
      prNumber = parseInt(options.pr);
    } else {
      console.error(chalk.red("Provide PR as owner/repo#42 or use --pr and --repo flags"));
      process.exit(1);
    }

    // GitHub token
    const token = options.token || config.apiKeys.github || process.env.GITHUB_TOKEN;
    if (!token) {
      console.error(chalk.red("GitHub token required. Set GITHUB_TOKEN env or run: pr-review config set GITHUB_TOKEN <token>"));
      process.exit(1);
    }

    const octokit = new Octokit({ auth: token });

    // Fetch PR info
    const spinner = ora("Fetching PR details...").start();
    try {
      const prInfo = await getPrInfo(octokit, owner, repo, prNumber);
      spinner.succeed(chalk.green(`PR: ${prInfo.title} (by @${prInfo.author})`));

      // Fetch diff
      const diffSpinner = ora("Fetching diff...").start();
      const diff = await getDiff(octokit, owner, repo, prNumber);
      diffSpinner.succeed(chalk.green(`Diff: ${diff.length.toLocaleString()} bytes`));

      // Get model
      const { provider, modelId } = getModel(config, options.model);
      const aiSpinner = ora(`Generating review with ${provider}/${modelId}...`).start();

      const { model } = createModel(provider, modelId, config);
      const { text } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: `Repository: ${owner}/${repo}\nPR: #${prNumber} - ${prInfo.title}\nby @${prInfo.author}\n\nDiff:\n\`\`\`diff\n${diff}\n\`\`\``,
      });

      aiSpinner.succeed(chalk.green("Review generated!"));

      // Track local usage
      trackReview(provider, modelId);

      // Output
      console.log("\n" + chalk.bold("─".repeat(60)));
      console.log(chalk.bold.cyan("  📋 AI Code Review"));
      console.log(chalk.dim(`  Model: ${provider}/${modelId}`));
      console.log(chalk.dim(`  PR: ${owner}/${repo}#${prNumber}`));
      console.log("─".repeat(60) + "\n");
      console.log(text);

      // Save to file option
      const fs = await import("fs/promises");
      const filename = `pr-review-${owner}-${repo}-${prNumber}.md`;
      await fs.writeFile(filename, text, "utf-8");
      console.log(chalk.dim(`\n📁 Saved to ${filename}`));

    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
      process.exit(1);
    }
  });
