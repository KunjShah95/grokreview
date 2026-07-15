import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const eslintConfig = [
  // TypeScript rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      ...tsPlugin.configs["recommended"].rules,
    },
  },

  // Next.js rules
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // Ignore generated files and separate package dirs
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "lib/generated/**",
      "cli/**",
      "mcp/**",
    ],
  },
];

export default eslintConfig;
