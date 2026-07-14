# 🚀 GrokReview

> **AI-powered Pull Request reviews. Use any model, any provider, any workflow.**

GrokReview is a next-generation code review platform that connects to your GitHub repositories and automatically reviews every pull request using AI. It supports **5 AI providers** (Groq, Mistral, HuggingFace, OpenRouter, Ollama), has a **streaming SSE review engine**, **GitHub Actions CI integration**, an **analytics dashboard with heatmaps**, a **multi-model comparison tool**, and a full-featured **CLI**.

---

## ✨ Features

### 🤖 Multi-Provider AI
| Provider | Models | Free? |
|----------|--------|-------|
| **Groq** | Llama 3 70B/8B, Mixtral, Gemma 2, DeepSeek R1 | ✅ Free |
| **Mistral** | Mistral Large, Nemo, Codestral | ✅ Free tier |
| **HuggingFace** | Zephyr 7B, Mistral 7B, Llama 3.2 3B, DeepSeek R1 | ✅ Free |
| **OpenRouter** | 200+ models (gateway) | ✅ Free tier |
| **Ollama** | Local models (llama3.2, codellama, phi3, qwen2.5-coder) | ✅ Free (local) |

### 📊 Dashboard
- **Overview** — Real-time stats: total reviews, monthly usage, connected repos, plan status
- **Repositories** — Infinite-scroll repo list with search, visibility filter, sync status
- **Pull Requests** — Full review history with expandable reviews, status filters, search
- **Analytics** — Review charts (line/pie/bar), GitHub-style contribution **heatmap**, model usage
- **Usage** — Monthly progress bar, 6-month history, cost estimates, daily activity mini-chart
- **Monthly Leaderboard** — Top contributors ranking with medals, trends, and progress bars

### ⚡ Streaming Reviews
Real-time SSE streaming so you see reviews appear **token-by-token** as the AI generates them. Includes model selector, copy/export, and stop/cancel controls.

### 🎯 Multi-Model Comparison
Compare two AI models **side-by-side** on the same PR. See speed comparison, unique findings per model, common findings both agreed on, and full review panels with copy buttons. Quick pairs: "Speed vs Quality" (8B vs 70B) and "Code Specialists".

### 🔍 Webhook Event Log
Live feed of incoming GitHub webhooks for debugging. Filter by event type, expand payloads, auto-refresh.

### 🖥️ CLI Tool (`pr-review`)
```bash
pr-review review owner/repo#42                 # Review any PR
pr-review review -p 42 -r owner/repo -m groq:llama3-70b  # Choose model
pr-review batch -r owner/repo                  # Batch review all open PRs
pr-review ci -p 42 -r owner/repo               # CI mode (exit code on failures)
pr-review models                               # List available models
pr-review models --local                       # Detect local Ollama models
pr-review usage                                # Show usage stats & limits
pr-review config set GROQ_API_KEY xxx          # Set API key
pr-review config list                          # Show configuration
```

### 🔔 Integrations
- **Slack** — Review notifications to Slack channels
- **Discord** — Review notifications to Discord servers
- **GitHub Actions** — Run as a CI check on every PR
- **Custom Prompts** — 5 templates (Default, Security Audit, Performance Audit, Simple, Educational)

### 🛡️ Reliability
- **Error Boundaries** — Catch-all error UI with retry on every dashboard page
- **Review Caching** — Skips re-review if head SHA hasn't changed
- **Graceful Fallback** — Falls back to OpenRouter if primary model fails
- **Signature Verification** — Validates GitHub webhook signatures

### 💰 Billing
- Razorpay subscription integration
- 5 free reviews per month
- Pro plan for unlimited reviews
- Usage tracking and cost estimation

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-org/grokreview.git
cd grokreview
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
# At minimum, set:
# DATABASE_URL=postgresql://...
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...
# At least one AI provider key (see below)
```

### 3. Set Up Database
```bash
docker compose up -d           # Start PostgreSQL
npx prisma migrate dev         # Run migrations
```

### 4. Configure AI Provider
Pick one or more:
```bash
# Groq (fastest, recommended)
GROQ_API_KEY=gsk_...

# OR OpenRouter (fallback, 200+ models)
OPENROUTER_API_KEY=sk-or-...

# OR Mistral
MISTRAL_API_KEY=...

# OR HuggingFace (free tier)
HUGGINGFACE_API_KEY=hf_...

# OR Ollama (fully local)
# Just install Ollama and pull a model:
# ollama pull llama3.2
```

### 5. Start Development
```bash
npm run dev
# Open http://localhost:3000
```

### 6. Install GitHub App
1. Go to Settings → GitHub App in the dashboard
2. Click "Install GitHub App"
3. Select repositories to grant access
4. Open a PR — review appears automatically!

---

## 📦 CLI Tool Setup

```bash
cd cli
npm install
npm run build
npm link  # or: npm install -g .
```

---

## 🏗️ Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   GitHub     │────▶│  Webhook    │────▶│   Inngest    │
│  Webhooks    │     │  Handler    │     │  Background  │
└──────────────┘     └─────────────┘     │     Jobs     │
                                         └──────┬───────┘
                                                │
┌──────────────┐     ┌─────────────┐            ▼
│  Dashboard   │◀────│  Prisma DB  │◀────┌──────────────┐
│  (Next.js)   │     │ (PostgreSQL)│     │   AI Review  │
└──────────────┘     └─────────────┘     │   Pipeline   │
                                          │              │
┌──────────────┐     ┌─────────────┐     │  Groq        │
│   CLI Tool   │────▶│  GitHub API │     │  Mistral     │
│  (pr-review) │     │  (Octokit)  │     │  HuggingFace │
└──────────────┘     └─────────────┘     │  OpenRouter  │
                                          │  Ollama      │
┌──────────────┐                          └──────────────┘
│  GitHub      │
│  Actions CI  │──────────────────────────▶ PR Comments
└──────────────┘
```

### Key Technologies
- **Frontend**: Next.js 16 (App Router), React 19, shadcn/ui, Tailwind CSS v4
- **Backend**: Next.js API routes, Prisma 7 (PostgreSQL), Inngest (background jobs)
- **Auth**: BetterAuth with GitHub OAuth
- **AI**: Vercel AI SDK (Groq, Mistral, HuggingFace, OpenRouter) + Ollama HTTP API
- **Vector DB**: Pinecone for code context
- **CLI**: Commander, Octokit, AI SDK

---

## 📁 Project Structure

```
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (sign-in)
│   ├── (protected)/dashboard/    # Dashboard pages
│   │   ├── page.tsx              # Overview
│   │   ├── analytics/            # Analytics + heatmap + leaderboard
│   │   ├── github/               # GitHub App management
│   │   ├── pull-request/         # PR history
│   │   ├── repos/                # Repository list
│   │   ├── settings/             # Settings (profile, models, prompts, integrations)
│   │   ├── usage/                # Usage tracking
│   │   └── webhooks/             # Webhook event log
│   └── api/                      # API routes
│       ├── github/               # GitHub webhook, callback, CI review
│       ├── reviews/stream/       # SSE streaming endpoint
│       ├── reviews/compare/      # Multi-model comparison endpoint
│       └── webhooks/log/         # Webhook log API
├── components/                   # Shared UI components
│   └── ui/                       # shadcn/ui components
├── features/                     # Feature modules
│   ├── ai/                       # Multi-provider AI system
│   │   ├── providers/            # Provider adapters (Groq, Mistral, etc.)
│   │   ├── registry.ts           # Provider registry
│   │   ├── streaming.ts          # SSE streaming support
│   │   └── types.ts              # AI model types
│   ├── analytics/                # Analytics, heatmap, leaderboard
│   ├── billing/                  # Subscription & usage
│   ├── dashboard/                # Dashboard shell, sidebar, nav
│   ├── github/                   # GitHub integration
│   ├── integrations/             # Slack/Discord webhooks
│   ├── prompts/                  # Custom review prompts
│   ├── reviews/                  # Review pipeline, history, comparison
│   ├── settings/                 # Settings types, model config
│   ├── usage/                    # Usage tracking
│   └── webhooks/                 # Webhook event log
├── cli/                          # CLI tool (pr-review)
│   └── src/commands/             # review, models, config, batch, ci, usage
├── prisma/                       # Database schema & migrations
└── lib/                          # Shared utilities
```

---

## 🧪 Running Tests

```bash
npm run lint       # ESLint
npx next build     # TypeScript check + build
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai/) for the unified AI interface
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Inngest](https://www.inngest.com/) for background job processing
- [Pinecone](https://www.pinecone.io/) for vector storage
- [Phosphor Icons](https://phosphoricons.com/) for the icon set
