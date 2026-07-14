# grokreview-cli

AI-powered GitHub pull request reviews from your terminal. Bring your own model: Groq, Mistral, HuggingFace, OpenRouter, or a local Ollama model. No lock-in.

The CLI shares the same review engine as [GrokReview](https://github.com/KunjShah95/grokreview), so local and automated reviews always agree.

## Install

```bash
npm i -g grokreview-cli
```

This installs the `pr-review` binary.

## Quick start

```bash
# Configure a provider key once
pr-review config set GROQ_API_KEY your-key-here

# Review a pull request
pr-review review owner/repo#42 --model groq:llama3-70b
```

## Commands

| Command | Description |
| --- | --- |
| `pr-review review <owner/repo#pr>` | Review a single pull request. |
| `pr-review batch -r <owner/repo>` | Review every open PR in a repository. |
| `pr-review ci` | Run as a CI check. Exits non-zero on critical findings. |
| `pr-review models` | List available models and detect local Ollama models. |
| `pr-review config set <KEY> <value>` | Store an API key or preference. |
| `pr-review usage` | Show local usage statistics and limits. |

### Review a PR

```bash
pr-review review owner/repo#42 --model groq:llama3-70b
pr-review review --pr 42 --repo owner/repo --model mistral:mistral-large
```

Options:

- `-p, --pr <number>` pull request number
- `-r, --repo <name>` repository full name (`owner/repo`)
- `-m, --model <name>` model, formatted `provider:model` (e.g. `groq:llama3-70b`)
- `-t, --token <token>` GitHub token (falls back to `GITHUB_TOKEN`)
- `--json-output` print JSON instead of formatted text

### Gate CI on review findings

```bash
pr-review ci -p 42 -r owner/repo --fail-on-warnings
```

Non-zero exit when a critical issue is found, so a red check blocks the merge.

## Configuration

Keys and preferences live in `~/.grokreview/config.json`. Provider keys can also be supplied through environment variables (`GROQ_API_KEY`, `MISTRAL_API_KEY`, `GITHUB_TOKEN`, and so on).

## Running fully local

Point the CLI at a local Ollama model to keep code on your machine:

```bash
pr-review review owner/repo#42 --model ollama:qwen2.5-coder
```

## License

MIT (c) Kunj Shah
