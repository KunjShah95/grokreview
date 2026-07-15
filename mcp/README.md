# grokreview-mcp

MCP (Model Context Protocol) server for [GrokReview](https://github.com/KunjShah95/grokreview). Exposes AI-powered
PR review, security scanning, and test generation as MCP tools — usable from Claude Code, Cursor, or any
MCP-compatible client, without needing to run the GrokReview web app.

## Tools

| Tool | Description |
|------|-------------|
| `review_pr` | Generates an AI code review for a GitHub pull request (correctness, security, performance, reliability, readability, maintainability). |
| `scan_security` | Scans a PR's diff for hardcoded secrets and common vulnerability shapes (SQL injection, XSS, SSRF, insecure config) using deterministic regex rules. |
| `generate_tests` | Generates unit test scaffolds for a PR's changed source files, auto-detecting the framework (Vitest, pytest, Go testing, JUnit, RSpec). |

## Setup

Requires a `GITHUB_TOKEN` (personal access token with `repo` read access) and at least one AI provider key.

```bash
npm install -g grokreview-mcp
```

Add it to your MCP client config (e.g. Claude Code's `.mcp.json` or Cursor's `mcp.json`):

```json
{
  "mcpServers": {
    "grokreview": {
      "command": "grokreview-mcp",
      "env": {
        "GITHUB_TOKEN": "ghp_...",
        "GROQ_API_KEY": "gsk_..."
      }
    }
  }
}
```

Supported provider env vars (priority order): `GROQ_API_KEY`, `MISTRAL_API_KEY`, `HUGGINGFACE_API_KEY`,
`GEMINI_API_KEY`, `OPENROUTER_API_KEY`.

## Development

```bash
npm install
npm run dev     # tsx watch
npm run build   # compiles to dist/
```

## License

MIT
