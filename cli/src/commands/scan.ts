import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { Octokit } from "octokit";
import { loadConfig } from "../utils/config.js";
import { getPrFiles, parsePrRef } from "../utils/pr-files.js";
import { scanFiles } from "../utils/security-rules.js";

const SEVERITY_COLOR: Record<string, (text: string) => string> = {
  critical: chalk.bgRed.white,
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.dim,
  info: chalk.dim,
};

export const scanCommand = new Command("scan")
  .description("Scan a pull request for hardcoded secrets and common vulnerability patterns")
  .argument("[pr-ref]", "PR reference (e.g. owner/repo#42)")
  .option("-p, --pr <number>", "Pull request number")
  .option("-r, --repo <name>", "Repository full name (e.g. owner/repo)")
  .option("-t, --token <token>", "GitHub personal access token (or GITHUB_TOKEN env)")
  .option("--json", "Also print findings as JSON")
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
      spinner.succeed(chalk.green(`Fetched ${files.length} changed file(s)`));

      const scanSpinner = ora("Scanning for secrets and vulnerability patterns...").start();
      const findings = scanFiles(files);
      scanSpinner.succeed(
        findings.length === 0
          ? chalk.green("No issues found")
          : chalk.yellow(`Found ${findings.length} issue(s)`)
      );

      console.log("\n" + chalk.bold("─".repeat(60)));
      console.log(chalk.bold.cyan(`  🛡  Security Scan — ${owner}/${repo}#${prNumber}`));
      console.log("─".repeat(60) + "\n");

      if (findings.length === 0) {
        console.log(chalk.green("  ✓ No hardcoded secrets or vulnerability patterns detected.\n"));
      } else {
        for (const finding of findings) {
          const color = SEVERITY_COLOR[finding.severity] || chalk.white;
          console.log(`  ${color(` ${finding.severity.toUpperCase()} `)} ${chalk.bold(finding.category)} ${chalk.dim(`${finding.filePath}${finding.line ? `:${finding.line}` : ""}`)}`);
          console.log(`    ${finding.message}`);
          if (finding.suggestion) {
            console.log(chalk.dim(`    Fix: ${finding.suggestion}`));
          }
          console.log();
        }
      }

      if (options.json) {
        console.log(JSON.stringify({ findings }, null, 2));
      }

      if (findings.some((f) => f.severity === "critical")) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
      process.exit(1);
    }
  });
