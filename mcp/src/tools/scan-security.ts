import { z } from "zod";
import { getOctokit, getPrFiles } from "../github.js";
import { scanFiles } from "../security.js";

export const scanSecurityInputSchema = {
  owner: z.string().describe("Repository owner, e.g. 'facebook'"),
  repo: z.string().describe("Repository name, e.g. 'react'"),
  prNumber: z.number().int().describe("Pull request number"),
};

export async function scanSecurity(input: { owner: string; repo: string; prNumber: number }) {
  const octokit = getOctokit();
  const files = await getPrFiles(octokit, input.owner, input.repo, input.prNumber);
  const findings = scanFiles(files);

  if (findings.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No security issues found in ${input.owner}/${input.repo}#${input.prNumber} (secret + heuristic vulnerability patterns).`,
        },
      ],
    };
  }

  const report = findings
    .map(
      (f) =>
        `- **[${f.severity.toUpperCase()}]** ${f.category} — \`${f.filePath}${f.line ? `:${f.line}` : ""}\`\n  ${f.message}${
          f.suggestion ? `\n  _Fix: ${f.suggestion}_` : ""
        }`
    )
    .join("\n");

  return {
    content: [
      {
        type: "text" as const,
        text: `## Security Scan — ${input.owner}/${input.repo}#${input.prNumber}\n\nFound ${findings.length} issue(s):\n\n${report}`,
      },
    ],
  };
}
