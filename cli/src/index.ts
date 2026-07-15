#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { reviewCommand } from "./commands/review.js";
import { modelsCommand } from "./commands/models.js";
import { configCommand } from "./commands/config.js";
import { batchCommand } from "./commands/batch.js";
import { ciCommand } from "./commands/ci.js";
import { usageCommand } from "./commands/usage.js";
import { scanCommand } from "./commands/scan.js";
import { generateTestsCommand } from "./commands/generate-tests.js";

// No explicit .name() — Commander infers it from how the binary was
// invoked (argv[1]), so help text shows "grokreview" or "pr-review"
// correctly no matter which of the two installed bin aliases was used.
const program = new Command()
  .description("AI-powered GitHub Pull Request reviewer")
  .version("0.1.0")
  .option("--json-output", "Output results as JSON");

program.addCommand(reviewCommand);
program.addCommand(modelsCommand);
program.addCommand(configCommand);
program.addCommand(batchCommand);
program.addCommand(ciCommand);
program.addCommand(usageCommand);
program.addCommand(scanCommand);
program.addCommand(generateTestsCommand);

program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
  console.log(chalk.bold("  \n  🔍 GrokReview CLI\n"));
  program.outputHelp();
  console.log(`\n  ${chalk.dim("Examples (or use the `pr-review` alias interchangeably):")}
    ${chalk.cyan("grokreview review owner/repo#42")}        ${chalk.dim("Review PR #42")}
    ${chalk.cyan("grokreview review --pr 42 --repo owner/repo")} ${chalk.dim("Alternative syntax")}
    ${chalk.cyan("grokreview models")}                        ${chalk.dim("List available models")}
    ${chalk.cyan("grokreview batch -r owner/repo")}           ${chalk.dim("Batch review all open PRs")}
    ${chalk.cyan("grokreview ci -p 42 -r owner/repo")}        ${chalk.dim("CI check mode")}
    ${chalk.cyan("grokreview scan owner/repo#42")}            ${chalk.dim("Scan a PR for secrets & vulnerabilities")}
    ${chalk.cyan("grokreview generate-tests owner/repo#42")}  ${chalk.dim("Generate unit tests for a PR")}
    ${chalk.cyan("grokreview config set GROQ_API_KEY xxx")}   ${chalk.dim("Set API key")}
    ${chalk.cyan("grokreview usage")}                            ${chalk.dim("Show usage stats & limits")}
  `);
}
