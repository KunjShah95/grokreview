import { z } from "zod";
import { generateText } from "ai";
import { getOctokit, getPrDiff, getPrInfo } from "../github.js";
import { resolveModel } from "../providers.js";

const SYSTEM_PROMPT = `You are an expert code reviewer. Review the provided unified diff and write a concise, actionable pull request review in markdown.
Analyze: correctness, security, performance, reliability, readability, and maintainability.
Start with a one-line summary, then use sections: ✅ What looks good, ⚠️ Suggestions, 🚨 Issues.
Be specific, constructive, and proportional. If the diff has no concerns, say so clearly.`;

export const reviewPrInputSchema = {
  owner: z.string().describe("Repository owner, e.g. 'facebook'"),
  repo: z.string().describe("Repository name, e.g. 'react'"),
  prNumber: z.number().int().describe("Pull request number"),
  model: z.string().optional().describe("Optional override, e.g. 'groq:llama3-70b-8192'"),
};

export async function reviewPr(input: {
  owner: string;
  repo: string;
  prNumber: number;
  model?: string;
}) {
  const octokit = getOctokit();
  const prInfo = await getPrInfo(octokit, input.owner, input.repo, input.prNumber);
  const diff = await getPrDiff(octokit, input.owner, input.repo, input.prNumber);

  const { model, name } = resolveModel(input.model);
  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: `Repository: ${input.owner}/${input.repo}\nPR: #${input.prNumber} - ${prInfo.title}\nby @${prInfo.author}\n\nDiff:\n\`\`\`diff\n${diff}\n\`\`\``,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: `## AI Review — ${input.owner}/${input.repo}#${input.prNumber}\n**${prInfo.title}** by @${prInfo.author}\n_Model: ${name}_\n\n${text}`,
      },
    ],
  };
}
