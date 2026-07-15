# grokreview

AI-powered GitHub pull request reviews, security scans, and test generation from your terminal. Bring your own model: Groq, Mistral, HuggingFace, Gemini, OpenRouter, or a local Ollama model. No lock-in.

The CLI shares the same review engine as [GrokReview](https://github.com/KunjShah95/grokreview), so local and automated reviews always agree.

## Install

```bash
npm install -g grokreview
```

This installs two equivalent binaries — use whichever you prefer:

```bash
grokreview review owner/repo#42
pr-review review owner/repo#42
```

The rest of this README uses `grokreview`, but every command works identically as `pr-review`.

## Quick start

```bash
# Configure a provider key once
grokreview config set GROQ_API_KEY your-key-here

# Review a pull request
grokreview review owner/repo#42 --model groq:llama3-70b
```

## Commands

| Command | Description |
| --- | --- |
| `grokreview review <owner/repo#pr>` | Review a single pull request. |
| `grokreview batch -r <owner/repo>` | Review every open PR in a repository. |
| `grokreview ci` | Run as a CI check. Exits non-zero on critical findings. |
| `grokreview models` | List available models and detect local Ollama models. |
| `grokreview scan <owner/repo#pr>` | Scan a PR for hardcoded secrets and vulnerability patterns (no AI cost). |
| `grokreview generate-tests <owner/repo#pr>` | Generate unit test scaffolds for a PR's changed files. |
| `grokreview config set <KEY> <value>` | Store an API key or preference. |
| `grokreview usage` | Show local usage statistics and limits. |

### Review a PR

```bash
grokreview review owner/repo#42 --model groq:llama3-70b
grokreview review --pr 42 --repo owner/repo --model mistral:mistral-large
```

Options:

- `-p, --pr <number>` pull request number
- `-r, --repo <name>` repository full name (`owner/repo`)
- `-m, --model <name>` model, formatted `provider:model` (e.g. `groq:llama3-70b`)
- `-t, --token <token>` GitHub token (falls back to `GITHUB_TOKEN`)
- `--json-output` print JSON instead of formatted text

### Scan a PR for security issues

```bash
grokreview scan owner/repo#42
grokreview scan owner/repo#42 --json
```

Deterministic regex rules only (no AI call, no cost) — hardcoded secrets (AWS/GitHub/Slack/Stripe keys, private keys, JWTs) plus common vulnerability shapes (SQL injection, XSS, SSRF, insecure config). Exits non-zero if a critical finding (leaked secret) is detected.

### Generate unit tests for a PR

```bash
grokreview generate-tests owner/repo#42 --model groq:llama3-70b
grokreview generate-tests owner/repo#42 --output ./generated-tests
```

Generates test scaffolds for up to 3 changed source files, auto-detecting the framework (Vitest, pytest, Go `testing`, JUnit, RSpec) from file extension. Pass `--output <dir>` to write the generated files to disk instead of just printing them.

### Gate CI on review findings

```bash
grokreview ci -p 42 -r owner/repo --fail-on-warnings
```

Non-zero exit when a critical issue is found, so a red check blocks the merge.

## Configuration

Keys and preferences live in `~/.grokreview/config.json`. Provider keys can also be supplied through environment variables (`GROQ_API_KEY`, `MISTRAL_API_KEY`, `HUGGINGFACE_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `GITHUB_TOKEN`, and so on).

## Running fully local

Point the CLI at a local Ollama model to keep code on your machine:

```bash
grokreview review owner/repo#42 --model ollama:qwen2.5-coder
```

## License

MIT (c) Kunj Shah
