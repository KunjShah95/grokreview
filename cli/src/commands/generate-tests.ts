import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { Octokit } from "octokit";
import { z } from "zod";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createHuggingFace } from "@ai-sdk/huggingface";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { loadConfig, type CliConfig } from "../utils/config.js";
import { getPrFiles, parsePrRef, type PrFile } from "../utils/pr-files.js";
import { detectFramework, isAlreadyATest, type FrameworkInfo } from "../utils/detect-framework.js";
import { trackAction } from "./usage.js";

const MAX_FILES = 3;

const testSchema = z.object({
  content: z.string().describe("The complete generated test file source code, no markdown fences"),
});

function getModel(config: CliConfig, modelArg?: string) {
  if (modelArg) {
    const parts = modelArg.split(":");
    return { provider: parts[0].toLowerCase(), modelId: parts[1] || "llama3-8b-8192" };
  }
  if (config.preferences?.defaultProvider && config.preferences?.defaultModel) {
    return { provider: config.preferences.defaultProvider, modelId: config.preferences.defaultModel };
  }
  if (config.apiKeys.groq) return { provider: "groq", modelId: "llama3-8b-8192" };
  if (config.apiKeys.mistral) return { provider: "mistral", modelId: "open-mistral-nemo" };
  if (config.apiKeys.huggingface) return { provider: "huggingface", modelId: "HuggingFaceH4/zephyr-7b-beta" };
  if (config.apiKeys.gemini) return { provider: "gemini", modelId: "gemini-2.0-flash" };
  if (config.apiKeys.openrouter) return { provider: "openrouter", modelId: "openrouter/free" };
  throw new Error(
    "No AI provider configured.\nRun: pr-review config set GROQ_API_KEY <key>\nOr set environment variables: GROQ_API_KEY, MISTRAL_API_KEY, etc."
  );
}

function createModel(provider: string, modelId: string, config: CliConfig) {
  switch (provider) {
    case "groq":
      return createGroq({ apiKey: config.apiKeys.groq })(modelId);
    case "mistral":
      return createMistral({ apiKey: config.apiKeys.mistral })(modelId);
    case "huggingface":
      return createHuggingFace({ apiKey: config.apiKeys.huggingface })(modelId);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey: config.apiKeys.gemini })(modelId);
    case "openrouter":
      return createOpenAI({ apiKey: config.apiKeys.openrouter, baseURL: "https://openrouter.ai/api/v1" })(modelId);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function generateOneTest(
  file: PrFile,
  framework: FrameworkInfo,
  provider: string,
  modelId: string,
  config: CliConfig
) {
  const model = createModel(provider, modelId, config);
  const { object } = await generateObject({
    model,
    schema: testSchema,
    system:
      "You are a senior engineer writing unit tests for a pull request diff. Focus on changed behavior, " +
      "1-4 focused test cases, realistic imports. Return only test file source code.",
    prompt: `File: ${file.filePath}\n${framework.hint}\n\nDiff:\n\`\`\`diff\n${file.patch}\n\`\`\``,
  });
  return { filePath: file.filePath, framework: framework.framework, content: object.content };
}

export const generateTestsCommand = new Command("generate-tests")
  .description("Generate unit test scaffolds for a pull request's changed files")
  .argument("[pr-ref]", "PR reference (e.g. owner/repo#42)")
  .option("-p, --pr <number>", "Pull request number")
  .option("-r, --repo <name>", "Repository full name (e.g. owner/repo)")
  .option("-m, --model <name>", "AI model (e.g. groq:llama3-70b, mistral:mistral-large)")
  .option("-t, --token <token>", "GitHub personal access token (or GITHUB_TOKEN env)")
  .option("-o, --output <dir>", "Directory to write generated test files into")
  .action(async (prRef, options) => {
    const config = loadConfig();

    let owner = "";
    let repo = "";
    let prNumber = 0;

    if (prRef) {
      const parsed = parsePrRef(prRef);
      if (!parsed) {
        console.error(chalk.red("Invalid PR reference. Use format: owner/repo#42"));
        process.exit(1);
      }
      ({ owner, repo, prNumber } = parsed);
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

    const token = options.token || config.apiKeys.github || process.env.GITHUB_TOKEN;
    if (!token) {
      console.error(chalk.red("GitHub token required. Set GITHUB_TOKEN env or run: pr-review config set GITHUB_TOKEN <token>"));
      process.exit(1);
    }

    const octokit = new Octokit({ auth: token });

    const spinner = ora("Fetching pull request files...").start();
    try {
      const files = await getPrFiles(octokit, owner, repo, prNumber);
      const testable = files.filter((f) => !isAlreadyATest(f.filePath) && detectFramework(f.filePath)).slice(0, MAX_FILES);

      if (testable.length === 0) {
        spinner.warn(chalk.yellow("No testable source files found in this PR."));
        return;
      }
      spinner.succeed(chalk.green(`Found ${testable.length} testable file(s)`));

      const { provider, modelId } = getModel(config, options.model);
      const genSpinner = ora(`Generating tests with ${provider}/${modelId}...`).start();

      const results = await Promise.all(
        testable.map((file) => generateOneTest(file, detectFramework(file.filePath)!, provider, modelId, config))
      );
      genSpinner.succeed(chalk.green(`Generated ${results.length} test file(s)`));

      trackAction("test-gen", provider, modelId);

      console.log("\n" + chalk.bold("─".repeat(60)));
      console.log(chalk.bold.cyan(`  🧪 Generated Tests — ${owner}/${repo}#${prNumber}`));
      console.log(chalk.dim(`  Model: ${provider}/${modelId}`));
      console.log("─".repeat(60) + "\n");

      const fs = await import("fs/promises");
      const path = await import("path");
      for (const result of results) {
        console.log(chalk.cyan(`  ${result.filePath} (${result.framework})`));
        console.log(result.content);
        console.log();

        if (options.output) {
          const ext = path.extname(result.filePath) || ".txt";
          const baseName = path.basename(result.filePath, ext);
          const outPath = path.join(options.output, `${baseName}.test${ext}`);
          await fs.mkdir(options.output, { recursive: true });
          await fs.writeFile(outPath, result.content, "utf-8");
          console.log(chalk.dim(`  📁 Saved to ${outPath}\n`));
        }
      }
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
      process.exit(1);
    }
  });
