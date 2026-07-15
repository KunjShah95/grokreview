# 🗺️ GrokReview - Complete Roadmap

## ✅ Current Features

### Core Platform
- [x] Next.js 16 App Router with TypeScript
- [x] shadcn/ui component library with premium design
- [x] Dark/light theme support
- [x] Docker Compose for PostgreSQL
- [x] Prisma 7 ORM with migrations
- [x] TanStack Query for data fetching

### Brand & Identity
- [x] Project renamed to **GrokReview**
- [x] Updated metadata, sidebar, CLI branding, CI workflow comments
- [x] GitHub App renamed to GrokReview

### Authentication
- [x] GitHub OAuth via BetterAuth
- [x] Session management
- [x] Auth middleware (proxy.ts)
- [x] Protected/Public route groups

### Dashboard
- [x] Sidebar navigation with 7 nav items (Overview, Repos, PRs, Usage, Analytics, GitHub App, Webhooks, Settings)
- [x] User menu with avatar, sign-out, and plan badge
- [x] Repo list with infinite scroll, search, and filters
- [x] GitHub App connection management
- [x] **Overview page** with real stats (total reviews, monthly, connected repos, plan, quick links)
- [x] **Error Boundaries** on all dashboard pages with retry + dashboard link
- [x] Updated nav icons: ChartBar for Usage, ChartLine for Analytics

### AI Review Pipeline
- [x] GitHub webhook receiver with signature verification
- [x] PR file fetching from GitHub API
- [x] Code chunking for vector search
- [x] Pinecone vector storage for PR context
- [x] AI review generation with fallback
- [x] PR comment posting
- [x] Inngest background job for reviews
- [x] **Review caching** (skip re-review if same head SHA)

### Multi-Provider AI System
- [x] **Groq** — 5 free models (Llama 3 70B/8B, Mixtral, Gemma 2, DeepSeek R1)
- [x] **Mistral** — 4 models (Large, Small, Nemo, Codestral)
- [x] **HuggingFace** — 4 free inference models
- [x] **OpenRouter** — 200+ model gateway (fallback)
- [x] **Ollama** — Local model detection + usage
- [x] Auto provider detection based on configured API keys
- [x] Graceful fallback if primary model fails
- [x] **Model field** tracked in database per review

### Streaming Reviews
- [x] **SSE streaming endpoint** (`/api/reviews/stream`)
- [x] **Real-time token-by-token display** in UI
- [x] Model selector dropdown (provider + model)
- [x] Copy review, Export as Markdown, Stop/Clear controls
- [x] All providers support streaming (Ollama via HTTP, others via AI SDK)
- [x] React hook (`useStreamingReview`) with abort control

### Multi-Model Comparison
- [x] **Parallel review generation** with two models
- [x] **Side-by-side UI** with speed comparison
- [x] **Unique findings per model** (word-overlap similarity scoring)
- [x] **Common findings** (both models agreed)
- [x] Quick pairs: "Speed vs Quality" (8B vs 70B), "Code Specialists" (DeepSeek vs Codestral)
- [x] Copy individual review panels
- [x] API endpoint (`/api/reviews/compare`)

### PR Review History Dashboard
- [x] Full table of reviewed PRs with status, date, comments
- [x] Status filter buttons with counts
- [x] Search by title, repo, or author
- [x] Expandable rows with PR metadata (branch, SHA, dates, model)
- [x] Truncated review text with "Show full review" toggle
- [x] Stats cards (Total, Reviewed, Pending, Processing, Rate Limited)

### Webhook Event Log
- [x] Live log of incoming webhooks for debugging
- [x] Auto-refresh (5s interval)
- [x] Filterable by event type
- [x] Expandable payload viewer
- [x] In-memory event log (max 200 entries)
- [x] Integrated webhook handler logging

### GitHub Actions Integration
- [x] CI workflow (`.github/workflows/pr-review.yml`)
- [x] API endpoint (`/api/github/ci-review`) with API key auth
- [x] Fetches PR diff directly via GITHUB_TOKEN
- [x] Posts review as PR comment
- [x] Sets check run status (success/failure/neutral/skipped)
- [x] Handles `ready_for_review` event

### Custom Review Prompts
- [x] 5 templates: Default, Security Audit, Performance Audit, Simple, Educational
- [x] Prompt editor with template quick-select
- [x] Local storage persistence
- [x] Reset to default option
- [x] Settings page integration (Prompts tab)

### Analytics & Monitoring
- [x] **Review statistics dashboard** (line/pie/bar charts via Recharts)
- [x] **GitHub-style contribution heatmap** (365 days, 5 color levels, tooltips, streaks)
- [x] **Monthly leaderboard** — top contributors with medals, trends, progress bars
- [x] **Usage tracking dashboard** — monthly progress bar, 6-month history, cost estimates
- [x] **Model usage breakdown** — bar chart + percentage bars
- [x] **Daily activity mini-chart** — 30-day sparkline
- [x] **Heatmap light mode support** — dual dark/light color palettes

### Repo Sync
- [x] Full codebase indexing to Pinecone
- [x] Code-aware reviews (context from entire repo)
- [x] Sync/re-sync per repository

### Billing
- [x] Razorpay subscription integration
- [x] Usage tracking (5 free reviews/month)
- [x] Upgrade/Cancel subscription UI
- [x] Usage-based limit enforcement

### Integrations
- [x] **Slack integration** — webhook notifications with test button
- [x] **Discord integration** — webhook notifications with test button
- [x] Integration settings page (Integrations tab)
- [x] Save/test webhook URLs

### CLI Tool (`pr-review`)
- [x] `pr-review review owner/repo#42` — Review any PR from terminal
- [x] `pr-review review --pr 42 --repo owner/repo` — Alternative syntax
- [x] `pr-review review -m groq:llama3-70b` — Model selection
- [x] `pr-review models` — List available AI models
- [x] `pr-review models --local` — Detect local Ollama models
- [x] `pr-review batch -r owner/repo` — Batch review all open PRs
- [x] `pr-review ci -p 42 -r owner/repo` — CI mode (exit code on failures)
- [x] `pr-review usage` — Show usage stats, limits, and tips
- [x] `pr-review usage --json` — Machine-readable output
- [x] `pr-review usage --reset` — Reset local tracking
- [x] `pr-review config list` — Show configuration
- [x] `pr-review config set GROQ_API_KEY xxx` — Set API key
- [x] Supports all 5 AI providers
- [x] Saves review to markdown file
- [x] Auto-tracks local usage (`trackReview()`)
- [x] Config stored in `~/.grokreview/config.json`

### Database
- [x] **Model field** migration (`add_model_to_pull_request`)
- [x] SQL migration file with ALTER TABLE statement
- [x] Migration JSON metadata

### CodeLens AI Features
- [x] **6th AI provider: Gemini** — Gemini 2.0 Flash/Flash Lite, 1.5 Pro
- [x] **Security Scanner** — deterministic secret detection (AWS/GitHub/Slack/Stripe keys, private keys, JWTs) + heuristic vuln patterns (SQLi, XSS, SSRF, insecure config) + AI-assisted pass, runs automatically on every review, with a re-scan button in the PR history UI
- [x] **AI Test Generator** — generates unit test scaffolds for a PR's changed files, auto-detecting framework (Vitest, pytest, Go testing, JUnit, RSpec), with copy-to-clipboard preview
- [x] **Chat with Repository (RAG)** — SSE-streamed Q&A over a synced codebase with inline file citations, session history persisted per user/repo
- [x] **Code Health Dashboard** — complexity trend chart, hotspot files, open security debt, estimated test coverage, computed automatically on every repo sync
- [x] **MCP Server** (`grokreview-mcp`) — exposes `review_pr`, `scan_security`, `generate_tests`, and `chat_with_repo` (via an API-key-authed bridge to a running deployment) as MCP tools for Claude Code/Cursor
- [x] **npm-publishable CLI and MCP packages** — pinned AI-SDK provider versions for a reproducible, working build; CLI published as `grokreview` (with a `pr-review` alias) with `scan`/`generate-tests` commands matching the MCP tools
- [x] **Security findings posted to GitHub** — critical/high findings are folded into the posted PR review; a leaked secret escalates the review to `REQUEST_CHANGES` (heuristic vuln patterns stay comment-only to avoid false-positive blocks)
- [x] **Tree-sitter AST-aware chunking** — synced repo files are chunked along function/class/method boundaries (JS/TS/TSX/Python) instead of fixed 80-line windows, improving both review context and RAG retrieval quality; falls back to line-based chunking for unsupported languages or parse failures. PR diffs stay line-based (a diff hunk is a fragment, not parseable as standalone source).

---

## 🚀 Phase 2: What's Next?

### 🔥 High Priority

| Feature | Description | Complexity |
|---------|-------------|------------|
| **PR Comment as Formal Review** | Use GitHub's review API (not just comments) | Low |
| **Multi-repo webhook support** | Auto-install webhooks on all repos | Medium |
| **Model selection per review** | Dropdown to choose model per PR | Medium |
| **Review quality scoring** | Rate reviews and provide feedback | Medium |

### 💰 Monetization & Billing

| Feature | Description |
|---------|-------------|
| **Stripe Payments** | Replace Razorpay with Stripe for global audience |
| **Usage-based billing** | Pay-per-review beyond free tier ($0.01/review) |
| **Team plans** | Multiple seats per organization |
| **Self-hosted license** | One-time fee for self-hosted version |
| **Review credits** | Buy credit packs (no subscription needed) |

### 🛠️ Developer Experience

| Feature | Description |
|---------|-------------|
| **GitLab support** | Support GitLab MR webhooks |
| **Bitbucket support** | Support Bitbucket PR webhooks |
| **VS Code extension** | Inline PR reviews in VS Code |
| **API-first redesign** | Public REST API for third-party integrations |
| **Docker deployment** | One-command deploy with `docker compose up` |
| **Kubernetes Helm chart** | Production-grade K8s deployment |

### 🌐 Infrastructure & DevOps

| Feature | Description |
|---------|-------------|
| **Alternative vector DBs** | Support Qdrant, Weaviate, Chroma (not just Pinecone) |
| **SQLite support** | Embedded database for small deployments |
| **Redis caching** | Cache GitHub API responses, reduce rate limits |
| **S3 storage** | Store review artifacts (diff snapshots, review history) |
| **Email notifications** | Send review summary via email (Resend/SendGrid) |
| **Weekly leaderboard** | Automated snapshots and reporting |

### 🔒 Security & Compliance

| Feature | Description |
|---------|-------------|
| **SOC2 compliance** | Audit logging, data retention policies |
| **Code not stored** | Opt-in: never store code diffs after review |
| **Review approval gates** | Block merging without AI review |
| **Sensitive data detection** | Scan for leaked secrets/API keys in PRs |
| **SBOM generation** | Generate Software Bill of Materials from PR deps |

### 📦 CLI Tool Enhancements

| Feature | Description |
|---------|-------------|
| **Interactive mode** | `pr-review review owner/repo#42 --interactive` |
| **Review diff** | Show what changed between two reviews |
| **Export to HTML** | `--format html` for email-friendly output |
| **GitHub Actions reporter** | `pr-review pr 42 --annotate` — inline annotations |

### 🌍 Community & Ecosystem

| Feature | Description |
|---------|-------------|
| **Review templates marketplace** | Shareable prompt templates |
| **Open source** | MIT license, community contributions |
| **Documentation site** | Nextra-based docs site |
| **Demo video** | YouTube walkthrough |
| **Discord community** | User support channel |

---

## 📈 Growth Strategy

### Phase 1: Foundation ✅ (Complete)
- Core PR review with 6 AI providers (Groq, Mistral, HuggingFace, Gemini, OpenRouter, Ollama)
- Streaming reviews with SSE
- Multi-model comparison
- Analytics dashboard with heatmap + leaderboard
- Usage tracking (web + CLI)
- GitHub Actions CI integration
- Custom review prompts
- Slack/Discord integrations
- Webhook event log
- Review caching
- Security scanner (secrets + vuln patterns + AI-assisted)
- AI test generator
- Chat with Repository (RAG)
- Code health dashboard
- MCP server for Claude Code / Cursor

### Phase 2: Power (Next 1-2 months)
- Formal PR reviews via GitHub API
- Multi-repo webhook support
- Model selection per review
- Stripe payments
- VS Code extension
- Review quality scoring

### Phase 3: Scale (3-6 months)
- GitLab/Bitbucket support
- Team plans
- Public API
- Redis caching
- Email notifications

### Phase 4: Enterprise (6-12 months)
- Self-hosted deployment
- SOC2 compliance
- SSO/SAML
- Custom models fine-tuning
- SLA guarantees

---

## 💡 Quick Wins (Implement in < 1 hour)

1. ⬜ **PR Comment as Review** — Use GitHub's `/repos/{owner}/{repo}/pulls/{pull_number}/reviews` endpoint
2. ⬜ **Multi-repo webhooks** — Auto-install on all repos via GitHub API
3. ⬜ **Review quality scoring** — Thumbs up/down on reviews
4. ⬜ **Keyboard shortcuts** — `g d` for dashboard, `g r` for repos, `g s` for settings
5. ⬜ **Review count badge** — Show remaining free reviews in sidebar
6. ⬜ **Re-review button** — Add "Review Again" button on PR history
