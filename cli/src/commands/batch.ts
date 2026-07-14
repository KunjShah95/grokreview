import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { Octokit } from "octokit";
import { loadConfig } from "../utils/config.js";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { createOpenAI } from "@ai-sdk/openai";

const SYSTEM_PROMPT = `You are an expert code reviewer. Review the provided unified diff and write a concise, actionable pull request review in markdown. Analyze: correctness, security, performance, reliability, readability, and maintainability. Start with a one-line summary, then use sections: ✅ What looks good, ⚠️ Suggestions, 🚨 Issues.`;

interface BatchOptions {
  repo: string;
  model?: string;
  token?: string;
  max?: string;
  state?: "open" | "closed" | "all";
}

export const batchCommand = new Command("batch")
  .description("Batch review all open PRs in a repository")
  .requiredOption("-r, --repo <name>", "Repository full name (e.g. owner/repo)")
  .option("-m, --model <name>", "AI model (e.g. groq:llama3-70b)")
  .option("-t, --token <token>", "GitHub personal access token")
  .option("--max <number>", "Maximum PRs to review", "5")
  .option("--state <state>", "PR state filter (open, closed, all)", "open")
  .action(async (options: BatchOptions) => {
    const config = loadConfig();
    const token = options.token || config.apiKeys.github || process.env.GITHUB_TOKEN;
    if (!token) {
      console.error(chalk.red("GitHub token required."));
      process.exit(1);
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = options.repo.split("/");

    // Fetch open PRs
    const spinner = ora("Fetching open pull requests...").start();
    try {
      const { data: prs } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: options.state as "open" | "closed" | "all",
        per_page: parseInt(options.max || "5"),
        sort: "updated",
        direction: "desc",
      });

      spinner.succeed(chalk.green(`Found ${prs.length} pull request(s)`));

      if (prs.length === 0) {
        console.log(chalk.dim("No pull requests to review."));
        return;
      }

      // Review each PR
      for (const pr of prs) {
        console.log(chalk.bold(`\n${"─".repeat(60)}`));
        console.log(chalk.cyan(`  #${pr.number} - ${pr.title}`));
        console.log(chalk.dim(`  by @${pr.user?.login || "unknown"}`));
        console.log(`${"─".repeat(60)}`);

        const diffSpinner = ora("Fetching diff...").start();
        try {
          const { data: diff } = await octokit.request(
            "GET /repos/{owner}/{repo}/pulls/{pull_number}",
            { owner, repo, pull_number: pr.number, mediaType: { format: "diff" } }
          );

          const diffText = (diff as unknown as string).slice(0, 50000);
          diffSpinner.succeed(`Diff: ${diffText.length.toLocaleString()} bytes`);

          // Generate review
          const reviewSpinner = ora("Generating review...").start();

          // Determine model
          let modelProvider = "groq";
          let modelId = "llama3-8b-8192";
          if (options.model) {
            const parts = options.model.split(":");
            modelProvider = parts[0];
            modelId = parts[1] || "llama3-8b-8192";
          } else if (config.preferences?.defaultProvider) {
            modelProvider = config.preferences.defaultProvider;
            modelId = config.preferences.defaultModel || "llama3-8b-8192";
          }

          let model;
          switch (modelProvider) {
            case "groq":
              model = createGroq({ apiKey: config.apiKeys.groq })(modelId);
              break;
            case "mistral":
              model = createMistral({ apiKey: config.apiKeys.mistral })(modelId);
              break;
            case "huggingface":
              model = createHuggingFace({ apiKey: config.apiKeys.huggingface })(modelId);
              break;
            case "openrouter":
              model = createOpenAI({ apiKey: config.apiKeys.openrouter, baseURL: "https://openrouter.ai/api/v1" })(modelId);
              break;
            default:
              throw new Error(`Unknown provider: ${modelProvider}`);
          }

          const { text } = await generateText({
            model,
            system: SYSTEM_PROMPT,
            prompt: `Repository: ${owner}/${repo}\nPR: #${pr.number} - ${pr.title}\nby @${pr.user?.login || "unknown"}\n\nDiff:\n\`\`\`diff\n${diffText}\n\`\`\``,
          });

          reviewSpinner.succeed("Review generated");

          // Output
          console.log(text);

          // Save per-PR file
          const fs = await import("fs/promises");
          const filename = `pr-review-${owner}-${repo}-${pr.number}.md`;
          await fs.writeFile(filename, text, "utf-8");
          console.log(chalk.dim(`  📁 Saved to ${filename}`));
        } catch (error) {
          diffSpinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown"}`));
        }
      }

      console.log(chalk.bold.green(`\n✓ Batch review complete for ${prs.length} PR(s)`));
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown"}`));
      process.exit(1);
    }
  });
