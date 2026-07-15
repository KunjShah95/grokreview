import { Command } from "commander";
import chalk from "chalk";
import { loadConfig, saveConfig, type CliConfig } from "../utils/config.js";

export const configCommand = new Command("config")
  .description("Manage CLI configuration (API keys, preferences)")
  .addCommand(
    new Command("list")
      .description("Show current configuration")
      .action(() => {
        const config = loadConfig();
        console.log(chalk.bold("\n  ⚙️  Configuration\n"));

        console.log(chalk.cyan("  API Keys:"));
        const keys = [
          ["GROQ_API_KEY", config.apiKeys.groq],
          ["MISTRAL_API_KEY", config.apiKeys.mistral],
          ["HUGGINGFACE_API_KEY", config.apiKeys.huggingface],
          ["GEMINI_API_KEY", config.apiKeys.gemini],
          ["OPENROUTER_API_KEY", config.apiKeys.openrouter],
          ["GITHUB_TOKEN", config.apiKeys.github],
        ] as const;

        for (const [name, value] of keys) {
          const status = value ? chalk.green("✓ set") : chalk.dim("not set");
          console.log(`    ${chalk.dim("•")} ${name}: ${status}`);
        }

        console.log(chalk.cyan("\n  Preferences:"));
        console.log(`    ${chalk.dim("•")} Default provider: ${chalk.cyan(config.preferences.defaultProvider || "auto")}`);
        console.log(`    ${chalk.dim("•")} Default model: ${chalk.cyan(config.preferences.defaultModel || "auto")}`);
        console.log(`    ${chalk.dim("•")} Config file: ${chalk.dim("~/.grokreview/config.json")}\n`);
      })
  )
  .addCommand(
    new Command("set")
      .description("Set a configuration value (e.g. GROQ_API_KEY your-key-here)")
      .argument("<key>", "Configuration key (e.g. GROQ_API_KEY, defaultProvider)")
      .argument("<value>", "Value to set")
      .action((key: string, value: string) => {
        const config = loadConfig();

        // API keys
        const apiKeys = ["GROQ_API_KEY", "MISTRAL_API_KEY", "HUGGINGFACE_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "GITHUB_TOKEN"] as const;
        if (apiKeys.includes(key as typeof apiKeys[number])) {
          (config.apiKeys as Record<string, string>)[key.toLowerCase().replace(/_api_key/g, "")] = value;
          saveConfig(config);
          console.log(chalk.green(`\n  ✓ ${key} saved to configuration\n`));
          console.log(chalk.dim("  You can also set it as an environment variable for security.\n"));
          return;
        }

        // Preferences
        if (key === "defaultProvider") {
          const valid = ["groq", "mistral", "huggingface", "gemini", "openrouter", "ollama"];
          if (!valid.includes(value.toLowerCase())) {
            console.error(chalk.red(`\n  ✗ Invalid provider. Valid options: ${valid.join(", ")}\n`));
            process.exit(1);
          }
          config.preferences.defaultProvider = value.toLowerCase();
          saveConfig(config);
          console.log(chalk.green(`\n  ✓ Default provider set to: ${value.toLowerCase()}\n`));
          return;
        }

        if (key === "defaultModel") {
          config.preferences.defaultModel = value;
          saveConfig(config);
          console.log(chalk.green(`\n  ✓ Default model set to: ${value}\n`));
          return;
        }

        console.error(chalk.red(`\n  ✗ Unknown config key: ${key}\n`));
        console.log(chalk.dim("  Valid keys: GROQ_API_KEY, MISTRAL_API_KEY, HUGGINGFACE_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, GITHUB_TOKEN, defaultProvider, defaultModel\n"));
      })
  );
