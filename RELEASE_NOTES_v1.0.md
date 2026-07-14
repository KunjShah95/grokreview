# GrokReview v1.0 — Initial Release 🚀

AI-powered Pull Request reviews that understand your entire codebase. Bring your own AI model — Groq, Mistral, OpenRouter, HuggingFace, or local Ollama. No lock-in.

## Features

### 🤖 Multi-Provider AI Reviews
- **5 AI providers**: Groq, Mistral, OpenRouter, HuggingFace, Ollama
- GitHub App integration — automatically reviews every new PR
- Streaming reviews via server-sent events
- Pinecone vector search for full codebase context
- On-demand repo sync for richer context-aware reviews

### 📊 Multi-Model Comparison
- Side-by-side reviews comparing any 2 models simultaneously
- Quick pairs: "Speed vs Quality" (8B vs 70B), "Code Specialists"
- Finding extraction with similarity scoring — shows unique vs shared findings
- Speed comparison with millisecond timing

### 📈 Analytics & Dashboard
- Overview dashboard with review counts, monthly usage, connected repos
- Usage tracking with monthly limits (free tier: 5 reviews/month)
- Model usage breakdown with percentage bars
- 6-month review history bar chart
- 30-day daily activity sparkline chart
- GitHub-style contribution heatmap
- Monthly review leaderboard with trends (up/down/new/same)
- Cost estimation per provider
- **Most Used Model** dashboard card with progress bar

### ⚠️ Usage Alert Emails
- Automatic email alerts at 80% and 100% of monthly limit
- Resend-powered transactional emails
- Amber warning theme at 80%, red critical theme at 100%
- Deduplication — one alert per billing cycle per threshold
- Background processing via Inngest

### 🖥️ CLI Tool (`pr-review`)
- `pr-review` — CLI for on-demand PR reviews
- `pr-review usage` — View usage stats and limits
- `pr-review usage --json` — Machine-readable output
- `pr-review models` — List and configure AI models
- `pr-review config` — CLI configuration management
- Local usage tracking with provider breakdown

### 🔍 PR History & Filtering
- Full PR history with expandable review comments
- Status filters: All | Reviewed | Pending | Processing | Rate Limited
- **Model filter**: Filter PRs by the AI model used
- Search by title, repository, or author
- Expandable rows with full review markdown

### 🛠️ Admin & Configuration
- GitHub App setup page with installation guide
- Webhook event log with status monitoring
- Settings page with usage summary
- Plan management (Free / Pro)
- Cancel subscription flow

## Changelog

### Added
- Multi-provider AI review generation (Groq, Mistral, OpenRouter, HuggingFace, Ollama)
- Multi-model comparison with parallel reviews and finding analysis
- Usage tracking with monthly limits and progress bars
- Usage alert emails via Resend (80% and 100% thresholds)
- Monthly review leaderboard with medal icons and trend badges
- Most popular model dashboard card
- Model filtering on PR history page
- PR history with expandable AI review content
- GitHub contribution-style review heatmap
- Streamed AI review responses via SSE
- Pinecone vector search for codebase context
- CLI tool with review, usage, models, and config commands
- Razorpay subscription integration
- Inngest background job processing
- Better Auth for GitHub OAuth

### Infrastructure
- Prisma ORM with PostgreSQL
- Next.js 16 with App Router
- Tailwind CSS v4 with shadcn/ui components
- Inngest for durable background functions
- Pinecone for vector embeddings
- Resend for transactional email
