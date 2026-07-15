import { z } from "zod";

export const chatWithRepoInputSchema = {
  repoFullName: z.string().describe("Repository full name, e.g. 'facebook/react'. Must already be synced in the GrokReview dashboard."),
  message: z.string().describe("The question to ask about the repository's codebase"),
};

type ChatBridgeResponse = {
  text: string;
  model: string;
  citations: Array<{ filePath: string; text: string }>;
};

/**
 * Asks a question about a repo's synced codebase via GrokReview's hosted
 * RAG chat. Requires a running GrokReview deployment — set GROKREVIEW_API_URL
 * and MCP_BRIDGE_API_KEY (the same value configured on that deployment).
 * Unlike review_pr/scan_security/generate_tests, this tool cannot run fully
 * standalone: chat needs the repo's Pinecone index and Postgres-backed sync
 * state, which only the hosted app has.
 */
export async function chatWithRepo(input: { repoFullName: string; message: string }) {
  const baseUrl = process.env.GROKREVIEW_API_URL;
  const apiKey = process.env.MCP_BRIDGE_API_KEY;

  if (!baseUrl || !apiKey) {
    return {
      content: [
        {
          type: "text" as const,
          text:
            "chat_with_repo requires a running GrokReview deployment. Set GROKREVIEW_API_URL " +
            "(e.g. https://your-grokreview-app.com) and MCP_BRIDGE_API_KEY (matching the value " +
            "configured on that deployment) in this MCP server's environment.",
        },
      ],
      isError: true,
    };
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/mcp/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ repoFullName: input.repoFullName, message: input.message }),
  });

  const data = (await response.json()) as ChatBridgeResponse & { error?: string };

  if (!response.ok) {
    return {
      content: [{ type: "text" as const, text: `chat_with_repo failed: ${data.error || response.statusText}` }],
      isError: true,
    };
  }

  const citations = data.citations?.length
    ? `\n\n**Sources:** ${data.citations.map((c) => `\`${c.filePath}\``).join(", ")}`
    : "";

  return {
    content: [
      {
        type: "text" as const,
        text: `${data.text}${citations}\n\n_Model: ${data.model}_`,
      },
    ],
  };
}
