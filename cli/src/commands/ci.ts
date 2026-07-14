import { Command } from "commander";
import chalk from "chalk";
import { Octokit } from "octokit";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { loadConfig } from "../utils/config.js";

const CI_SYSTEM_PROMPT = `You are a CI pipeline code reviewer. Review the provided diff and determine if it should pass or fail.
Output ONLY a JSON object with this structure:
{
  "conclusion": "success" | "failure" | "neutral",
  "summary": "One-line summary of findings",
  "criticalIssues": number,
  "suggestions": number,
  "details": "Detailed markdown review"
}
Focus only on bugs, security issues, and breaking changes for "failure". Style issues should be "neutral".`;

interface CICheckOptions {
  pr: string;
  repo: string;
  model?: string;
  token?: string;
  "fail-on-warnings"?: boolean;
  "json-output"?: boolean;
}

export const ciCommand = new Command("ci")
  .description("Run review as CI check — exits with error code if critical issues found")
  .requiredOption("-p, --pr <number>", "Pull request number")
  .requiredOption("-r, --repo <name>", "Repository full name (e.g. owner/repo)")
  .option("-m, --model <name>", "AI model (e.g. groq:llama3-70b)")
  .option("-t, --token <token>", "GitHub personal access token")
  .option("--fail-on-warnings", "Exit with error on suggestions too", false)
  .option("--json-output", "Output JSON instead of formatted text", false)
  .action(async (options: CICheckOptions) => {
    const config = loadConfig();
    const token = options.token || config.apiKeys.github || process.env.GITHUB_TOKEN;
    if (!token) {
      console.error(chalk.red("GitHub token required."));
      process.exit(1);
    }

    const octokit = new Octokit({ auth: token });
    const [owner, repo] = options.repo.split("/");
    const prNumber = parseInt(options.pr);

    try {
      // Fetch PR diff
      const { data: diff } = await octokit.request(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        { owner, repo, pull_number: prNumber, mediaType: { format: "diff" } }
      );
      const diffText = (diff as unknown as string).slice(0, 50000);

      // Fetch PR info
      const { data: pr } = await octokit.request(
        "GET /repos/{owner}/{repo}/pulls/{pull_number}",
        { owner, repo, pull_number: prNumber }
      );

      // Generate review
      let modelProvider = "groq";
      let modelId = "llama3-8b-8192";
      if (options.model) {
        const parts = options.model.split(":");
        modelProvider = parts[0];
        modelId = parts[1] || "llama3-8b-8192";
      }

      let model;
      switch (modelProvider) {
        case "groq":
          model = createGroq({ apiKey: config.apiKeys.groq || process.env.GROQ_API_KEY })(modelId);
          break;
        case "openrouter":
          model = createOpenAI({ apiKey: config.apiKeys.openrouter || process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" })(modelId);
          break;
        default:
          model = createGroq({ apiKey: config.apiKeys.groq || process.env.GROQ_API_KEY })("llama3-8b-8192");
      }

      const { text } = await generateText({
        model,
        system: CI_SYSTEM_PROMPT,
        prompt: `Repository: ${owner}/${repo}\nPR: #${prNumber} - ${pr.title}\nAuthor: @${pr.user?.login}\n\nDiff:\n\`\`\`diff\n${diffText}\n\`\`\``,
      });

      // Parse JSON response
      let result;
      try {
        // Extract JSON from response (handling markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        result = null;
      }

      if (!result) {
        // Fallback: treat as neutral
        result = {
          conclusion: "neutral",
          summary: "Could not parse CI result",
          criticalIssues: 0,
          suggestions: 0,
          details: text,
        };
      }

      if (options.jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.bold(`\n${"─".repeat(60)}`));
        console.log(chalk.bold.cyan(`  🔍 CI Code Review — ${options.repo}#${options.pr}`));
        console.log("─".repeat(60));

        const conclusionColor = result.conclusion === "success" ? chalk.green :
          result.conclusion === "failure" ? chalk.red : chalk.yellow;
        console.log(`\n  ${conclusionColor.bold(result.conclusion.toUpperCase())}`);
        console.log(`  ${result.summary}`);
        console.log(`  Critical issues: ${result.criticalIssues}, Suggestions: ${result.suggestions}`);

        if (result.details) {
          console.log(chalk.dim(`\n${"─".repeat(40)}\n`));
          console.log(result.details);
        }
      }

      // Exit with appropriate code
      if (result.conclusion === "failure") {
        process.exit(1);
      }
      if (options.failOnWarnings && result.suggestions > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown"}`));
      process.exit(1);
    }
  });
