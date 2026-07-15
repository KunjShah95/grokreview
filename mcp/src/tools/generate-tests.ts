import { z } from "zod";
import { generateObject } from "ai";
import { getOctokit, getPrFiles, type PrFile } from "../github.js";
import { resolveModel } from "../providers.js";

const MAX_FILES = 3;

// Mirrored (not imported) from features/test-gen/server/detect-framework.ts
// and cli/src/utils/detect-framework.ts — see CONTRIBUTING.md for why this
// isn't a shared package. Update all copies together.
const EXTENSION_HINT: Array<{ extensions: string[]; framework: string; hint: string }> = [
  { extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"], framework: "vitest", hint: "Use Vitest (`import { describe, it, expect } from 'vitest'`)." },
  { extensions: [".py"], framework: "pytest", hint: "Use pytest (plain `def test_...` functions with `assert`)." },
  { extensions: [".go"], framework: "go-test", hint: "Use Go's standard `testing` package." },
  { extensions: [".java", ".kt"], framework: "junit", hint: "Use JUnit 5 (`@Test` annotations)." },
  { extensions: [".rb"], framework: "rspec", hint: "Use RSpec (`describe`/`it` blocks)." },
];

function detectFramework(filePath: string) {
  return EXTENSION_HINT.find((entry) => entry.extensions.some((ext) => filePath.endsWith(ext))) ?? null;
}

function isAlreadyATest(filePath: string) {
  const lower = filePath.toLowerCase();
  return (
    /\.(test|spec)\.[jt]sx?$/.test(lower) ||
    /(^|\/)test_.*\.py$/.test(lower) ||
    /_test\.go$/.test(lower) ||
    lower.includes("__tests__/") ||
    lower.includes("/tests/")
  );
}

const testSchema = z.object({
  content: z.string().describe("The complete generated test file source code, no markdown fences"),
});

async function generateOneTest(file: PrFile, framework: { framework: string; hint: string }, modelOverride?: string) {
  const { model } = resolveModel(modelOverride);
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

export const generateTestsInputSchema = {
  owner: z.string().describe("Repository owner, e.g. 'facebook'"),
  repo: z.string().describe("Repository name, e.g. 'react'"),
  prNumber: z.number().int().describe("Pull request number"),
  model: z.string().optional().describe("Optional override, e.g. 'groq:llama3-70b-8192'"),
};

export async function generateTests(input: { owner: string; repo: string; prNumber: number; model?: string }) {
  const octokit = getOctokit();
  const files = await getPrFiles(octokit, input.owner, input.repo, input.prNumber);

  const testable = files
    .filter((f) => !isAlreadyATest(f.filePath) && detectFramework(f.filePath))
    .slice(0, MAX_FILES);

  if (testable.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No testable source files found in ${input.owner}/${input.repo}#${input.prNumber}.`,
        },
      ],
    };
  }

  const results = await Promise.all(
    testable.map((file) => generateOneTest(file, detectFramework(file.filePath)!, input.model))
  );

  const report = results
    .map((r) => `### ${r.filePath} (${r.framework})\n\`\`\`\n${r.content}\n\`\`\``)
    .join("\n\n");

  return {
    content: [
      {
        type: "text" as const,
        text: `## Generated Tests — ${input.owner}/${input.repo}#${input.prNumber}\n\n${report}`,
      },
    ],
  };
}
