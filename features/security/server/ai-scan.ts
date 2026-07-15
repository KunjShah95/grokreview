import { generateObject } from "ai";
import { z } from "zod";
import { getModel, getDefaultModel } from "@/features/ai";
import type { UserModelPreference } from "@/features/ai";
import type { PrFile } from "@/features/reviews/types/review";
import type { SecurityFindingInput } from "../types";

const SECURITY_SYSTEM_PROMPT = `You are a senior application security engineer reviewing a pull request diff.
Identify concrete, high-confidence security issues introduced by the diff — not style nitpicks.
Focus on: injection (SQL/NoSQL/command), XSS, SSRF, auth/session flaws, insecure deserialization,
exposed secrets, path traversal, insecure dependency usage, and misconfigurations (CORS, TLS, permissions).
Only report issues you can point to specific lines for. If the diff has no security issues, return an empty findings array.
Do not invent line numbers you cannot see in the diff — use the closest visible context if exact line numbers aren't available.`;

const findingSchema = z.object({
  filePath: z.string().describe("The file path this finding applies to, exactly as shown in the diff"),
  line: z.number().int().optional().describe("Line number in the new file version, if determinable"),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  category: z.enum(["secret", "sql-injection", "xss", "ssrf", "dependency", "insecure-config", "other"]),
  message: z.string().describe("One or two sentences describing the vulnerability"),
  suggestion: z.string().optional().describe("A concrete fix"),
});

const scanResultSchema = z.object({
  findings: z.array(findingSchema).max(15),
});

function formatDiffForPrompt(files: PrFile[]): string {
  return files
    .map((file) => `### ${file.filePath}\n\`\`\`diff\n${file.patch}\n\`\`\``)
    .join("\n\n");
}

/**
 * Runs an AI-assisted security review over a PR's diff, returning structured
 * findings. Best-effort — returns an empty array (never throws) if the model
 * call fails, so a flaky provider never blocks the deterministic regex scan.
 */
export async function runAiSecurityScan(
  files: PrFile[],
  modelPreference?: UserModelPreference
): Promise<SecurityFindingInput[]> {
  if (files.length === 0) {
    return [];
  }

  const { provider, modelId } = getDefaultModel(modelPreference);

  // The Ollama adapter doesn't reliably support structured object generation;
  // skip the AI pass rather than risk a noisy failure for local-only setups.
  if (provider === "ollama") {
    return [];
  }

  try {
    const model = getModel(provider, modelId);
    const { object } = await generateObject({
      model,
      schema: scanResultSchema,
      system: SECURITY_SYSTEM_PROMPT,
      prompt: `Review this pull request diff for security issues:\n\n${formatDiffForPrompt(files)}`,
    });

    return object.findings;
  } catch (error) {
    console.warn("[Security Scan] AI-assisted pass failed, using regex findings only:", error);
    return [];
  }
}
