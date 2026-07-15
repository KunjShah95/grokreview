#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { reviewPr, reviewPrInputSchema } from "./tools/review-pr.js";
import { scanSecurity, scanSecurityInputSchema } from "./tools/scan-security.js";
import { generateTests, generateTestsInputSchema } from "./tools/generate-tests.js";
import { chatWithRepo, chatWithRepoInputSchema } from "./tools/chat-with-repo.js";

const server = new McpServer({
  name: "grokreview-mcp",
  version: "0.1.0",
});

server.registerTool(
  "review_pr",
  {
    title: "Review a pull request",
    description:
      "Generates an AI code review (correctness, security, performance, reliability, readability, maintainability) for a GitHub pull request.",
    inputSchema: reviewPrInputSchema,
  },
  reviewPr
);

server.registerTool(
  "scan_security",
  {
    title: "Scan a pull request for security issues",
    description:
      "Scans a GitHub pull request's diff for hardcoded secrets and common vulnerability shapes (SQL injection, XSS, SSRF, insecure config) using deterministic regex rules.",
    inputSchema: scanSecurityInputSchema,
  },
  scanSecurity
);

server.registerTool(
  "generate_tests",
  {
    title: "Generate unit tests for a pull request",
    description:
      "Generates unit test scaffolds for the changed source files in a GitHub pull request, auto-detecting the test framework (Vitest, pytest, Go testing, JUnit, RSpec) from file extensions.",
    inputSchema: generateTestsInputSchema,
  },
  generateTests
);

server.registerTool(
  "chat_with_repo",
  {
    title: "Chat with a synced repository",
    description:
      "Asks a question about a repository's indexed codebase (RAG) via a running GrokReview deployment. " +
      "Requires GROKREVIEW_API_URL and MCP_BRIDGE_API_KEY to be set — unlike the other tools, this one " +
      "needs a hosted GrokReview instance with the repo already synced (it can't run fully standalone).",
    inputSchema: chatWithRepoInputSchema,
  },
  chatWithRepo
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GrokReview MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting GrokReview MCP server:", error);
  process.exit(1);
});
