import { generateObject } from "ai";
import { z } from "zod";
import { getModel, getDefaultModel } from "@/features/ai";
import type { UserModelPreference } from "@/features/ai";
import type { PrFile } from "@/features/reviews/types/review";
import type { GeneratedTestInput, TestFramework } from "../types";
import { buildTestFilePath, detectFrameworkForFile, isTestableSourceFile } from "./detect-framework";

/** Cap AI calls per PR — enough to demo the feature without hammering the provider. */
const MAX_FILES_TO_TEST = 3;

const TEST_GEN_SYSTEM_PROMPT = `You are a senior software engineer writing unit tests for a pull request diff.
Given a file's diff and its target test framework, write a complete, runnable test file that covers the
new or changed behavior. Focus on the added/changed lines — test the public behavior, not implementation
details. Include realistic imports (assume the source file is at the given path). Keep it concise: 1-4
focused test cases is enough. Return only the test file source code, no markdown fences or commentary.`;

const testGenSchema = z.object({
  content: z.string().describe("The complete generated test file source code, no markdown fences"),
});

function frameworkPromptHint(framework: TestFramework): string {
  switch (framework) {
    case "vitest":
      return "Use Vitest (`import { describe, it, expect } from 'vitest'`).";
    case "jest":
      return "Use Jest (`describe`/`it`/`expect` globals).";
    case "pytest":
      return "Use pytest (plain `def test_...` functions with `assert`).";
    case "go-test":
      return "Use Go's standard `testing` package (`func TestX(t *testing.T)`).";
    case "junit":
      return "Use JUnit 5 (`@Test` annotations, `org.junit.jupiter.api.Assertions`).";
    case "rspec":
      return "Use RSpec (`describe`/`it` blocks with `expect(...).to`).";
    default:
      return "";
  }
}

async function generateTestForFile(
  file: PrFile,
  framework: TestFramework,
  modelPreference?: UserModelPreference
): Promise<GeneratedTestInput | null> {
  const { provider, modelId } = getDefaultModel(modelPreference);

  // The Ollama adapter doesn't reliably support structured object generation.
  if (provider === "ollama") {
    return null;
  }

  try {
    const model = getModel(provider, modelId);
    const { object } = await generateObject({
      model,
      schema: testGenSchema,
      system: TEST_GEN_SYSTEM_PROMPT,
      prompt: `File: ${file.filePath}\n${frameworkPromptHint(framework)}\n\nDiff:\n\`\`\`diff\n${file.patch}\n\`\`\``,
    });

    return {
      filePath: file.filePath,
      testFilePath: buildTestFilePath(file.filePath, framework),
      framework,
      content: object.content,
    };
  } catch (error) {
    console.warn(`[Test Gen] Failed to generate test for ${file.filePath}:`, error);
    return null;
  }
}

/**
 * Generates unit tests for the most significant changed files in a PR.
 * Best-effort: files that fail generation are skipped rather than failing the whole run.
 */
export async function generateTestsForPr(
  files: PrFile[],
  modelPreference?: UserModelPreference
): Promise<GeneratedTestInput[]> {
  const testableFiles = files.filter((f) => isTestableSourceFile(f.filePath)).slice(0, MAX_FILES_TO_TEST);

  const results = await Promise.all(
    testableFiles.map((file) => {
      const framework = detectFrameworkForFile(file.filePath);
      if (!framework) return Promise.resolve(null);
      return generateTestForFile(file, framework, modelPreference);
    })
  );

  return results.filter((r): r is GeneratedTestInput => r !== null);
}
