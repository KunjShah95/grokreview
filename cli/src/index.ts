#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { reviewCommand } from "./commands/review.js";
import { modelsCommand } from "./commands/models.js";
import { configCommand } from "./commands/config.js";
import { batchCommand } from "./commands/batch.js";
import { ciCommand } from "./commands/ci.js";
import { usageCommand } from "./commands/usage.js";

const program = new Command()
  .name("pr-review")
  .description("AI-powered GitHub Pull Request reviewer")
  .version("0.1.0")
  .option("--json-output", "Output results as JSON");

program.addCommand(reviewCommand);
program.addCommand(modelsCommand);
program.addCommand(configCommand);
program.addCommand(batchCommand);
program.addCommand(ciCommand);
program.addCommand(usageCommand);

program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
  console.log(chalk.bold("  \n  🔍 GrokReview CLI\n"));
  program.outputHelp();
  console.log(`\n  ${chalk.dim("Examples:")}
    ${chalk.cyan("pr-review review owner/repo#42")}        ${chalk.dim("Review PR #42")}
    ${chalk.cyan("pr-review review --pr 42 --repo owner/repo")} ${chalk.dim("Alternative syntax")}
    ${chalk.cyan("pr-review models")}                        ${chalk.dim("List available models")}
    ${chalk.cyan("pr-review batch -r owner/repo")}           ${chalk.dim("Batch review all open PRs")}
    ${chalk.cyan("pr-review ci -p 42 -r owner/repo")}        ${chalk.dim("CI check mode")}
    ${chalk.cyan("pr-review config set GROQ_API_KEY xxx")}   ${chalk.dim("Set API key")}
    ${chalk.cyan("pr-review usage")}                            ${chalk.dim("Show usage stats & limits")}
  `);
}
