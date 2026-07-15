# 🔎 CodeLens AI — Hackathon Execution Plan

> **One-line pitch:** "CodeLens AI reviews your pull requests like a senior engineer — explaining, testing, and securing your code in plain English, in seconds."

This document is the end-to-end build plan for the CodeLens AI hackathon submission. It is written against **this repository (GrokReview)**, because ~70% of the pitch is already built here: multi-provider AI reviews, GitHub App integration, streaming, a dashboard, and repo vector-sync. The plan below reframes the remaining CodeLens AI features (Security Scanner, Test Generator, Chat-with-Repo, Code Health Dashboard) as extensions of this codebase instead of a rewrite — that's the fastest path to a working demo in a time-boxed hackathon.

---

## 1. What already exists vs. what's net-new

| CodeLens AI Feature | Status | Notes |
|---|---|---|
| 📂 GitHub Repository Import | ✅ Built | GitHub App + OAuth (`features/github`), webhook receiver, installation model |
| 🤖 AI Code Review (plain-English PR explanation) | ✅ Built | `features/reviews/server/generate-review.ts`, 5 providers, streaming SSE |
| 📝 PR Summary Generator | ⚠️ Partial | Review text includes a summary; needs a **dedicated structured summary** (title, risk level, files touched, TL;DR) separate from the line-by-line review |
| ⚡ CI/CD Integration | ✅ Built | `.github/workflows/pr-review.yml`, `/api/github/ci-review` |
| 📊 Code Health Dashboard | ⚠️ Partial | Analytics dashboard exists (charts, heatmap) but tracks *review activity*, not *code health* (complexity, debt, hotspots) — needs new metrics |
| 🛡 Security Scanner | ❌ New | No dedicated secret/vuln detection pass today |
| 🧪 Test Case Generator | ❌ New | No test-generation feature |
| 💬 Chat with Repository (RAG) | ❌ New | Pinecone sync exists (`features/repo-sync`) and is used *inside* the review pipeline, but there's no user-facing chat UI/endpoint over it |
| Bug/complexity estimation per PR | ❌ New | No complexity score field on `PullRequest` yet |

**Hackathon framing for judges:** "We didn't rebuild PR tooling from scratch — we shipped a working AI review platform, then spent the hackathon adding the three hardest features: security scanning, auto-generated tests, and conversational RAG chat over the whole repo."

---

## 2. Tech stack — reconciling the pitch stack with reality

The original pitch lists FastAPI / LangGraph / Qdrant / Chroma / MCP. This repo is Next.js / Prisma / Pinecone / Vercel AI SDK. Rewriting the stack mid-hackathon is a trap — **keep the existing stack**, and land the *concepts* from the pitch on top of it:

| Pitch concept | Hackathon decision | Why |
|---|---|---|
| FastAPI backend | **Keep Next.js API routes** | Already has auth, DB, webhooks, billing wired up. A second backend = integration tax we can't afford in 36–48h. |
| LangGraph orchestration | **Lightweight agent loop in TS** (`features/agent/`) using the Vercel AI SDK's tool-calling, structured as a graph of steps: `fetch → chunk → embed → retrieve → generate → validate`. If time allows, swap in `@langchain/langgraph` (has a JS/TS build) rather than standing up Python. | Same conceptual pitch ("LangGraph-style agent"), zero new runtime. |
| Gemini / OpenAI | **Add Gemini as a 6th provider** in `features/ai/providers/gemini.ts` (Google AI SDK has a generous free tier — good demo reliability backup alongside Groq). | Existing provider registry (`features/ai/registry.ts`) makes this a ~1 hour add. |
| Qdrant / Chroma | **Keep Pinecone** (already integrated, already synced per-repo). Mention Qdrant/Chroma as a "pluggable vector store" stretch goal, same interface. | Don't re-plumb a working vector pipeline under time pressure. |
| Tree-sitter | **Add** `web-tree-sitter` for AST-aware chunking (functions/classes as chunks instead of naive line-based chunking) — directly improves review *and* RAG chat quality. | High leverage, isolated change in `features/reviews/utils/chunk-code.ts`. |
| MCP | **Expose review/chat/test-gen as MCP tools** via a small MCP server (`mcp/server.ts`) so CodeLens AI can be driven from Claude Code / Cursor, not just the web dashboard. | Strong differentiator for a technical judging panel; \~2–3 hours using `@modelcontextprotocol/sdk`. |

---

## 3. Architecture (updated)

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   GitHub     │────▶│  Webhook /  │────▶│   Inngest    │
│  Webhooks    │     │  GitHub App │     │  Background  │
└──────────────┘     └─────────────┘     │     Jobs     │
                                          └──────┬───────┘
                                                 │
                          ┌──────────────────────┼───────────────────────┐
                          ▼                      ▼                       ▼
                 ┌────────────────┐    ┌──────────────────┐    ┌──────────────────┐
                 │  Review Agent  │    │  Security Scan   │    │  Test Generator   │
                 │  (summary +    │    │  Agent (secrets, │    │  Agent (unit test │
                 │  line reviews) │    │  vuln patterns)  │    │  scaffolds)       │
                 └────────┬───────┘    └────────┬─────────┘    └────────┬─────────┘
                          │                     │                       │
                          └──────────┬──────────┴───────────┬───────────┘
                                     ▼                       ▼
                          ┌────────────────────┐   ┌───────────────────┐
                          │  Tree-sitter AST    │   │  Pinecone (RAG)   │
                          │  chunker            │──▶│  vector store     │
                          └────────────────────┘   └─────────┬─────────┘
                                                              ▼
                                                   ┌────────────────────┐
                                                   │  Chat-with-Repo    │
                                                   │  endpoint (SSE)    │
                                                   └────────────────────┘
                          ┌────────────────────────────────────────────┐
                          │             Prisma (PostgreSQL)             │
                          └──────────────────────┬───────────────────────┘
                                                  ▼
                          ┌────────────────────────────────────────────┐
                          │  Dashboard (Next.js): Reviews · Security ·  │
                          │  Tests · Chat · Code Health · Analytics     │
                          └────────────────────────────────────────────┘
                                                  ▲
                          ┌───────────────────────┴────────────────────┐
                          │   MCP server + CLI (pr-review) — same core │
                          └─────────────────────────────────────────────┘
```

---

## 4. Data model additions (Prisma)

Add to `prisma/schema.prisma` (new models only — nothing existing changes shape):

```prisma
model SecurityFinding {
  id            String   @id @default(cuid())
  pullRequestId String
  pullRequest   PullRequest @relation(fields: [pullRequestId], references: [id], onDelete: Cascade)
  filePath      String
  line          Int?
  severity      String   // critical | high | medium | low | info
  category      String   // secret | sql-injection | xss | ssrf | dependency | insecure-config
  message       String
  suggestion    String?
  createdAt     DateTime @default(now())

  @@index([pullRequestId])
  @@map("security_finding")
}

model GeneratedTest {
  id            String   @id @default(cuid())
  pullRequestId String
  pullRequest   PullRequest @relation(fields: [pullRequestId], references: [id], onDelete: Cascade)
  filePath      String      // source file the test targets
  testFilePath  String      // suggested path for the generated test
  framework     String      // vitest | jest | pytest ...
  content       String      // generated test code
  createdAt     DateTime @default(now())

  @@index([pullRequestId])
  @@map("generated_test")
}

model ChatSession {
  id             String   @id @default(cuid())
  userId         String
  repoFullName   String
  createdAt      DateTime @default(now())
  messages       ChatMessage[]

  @@index([userId, repoFullName])
  @@map("chat_session")
}

model ChatMessage {
  id            String   @id @default(cuid())
  chatSessionId String
  chatSession   ChatSession @relation(fields: [chatSessionId], references: [id], onDelete: Cascade)
  role          String   // user | assistant
  content       String
  citedChunks   Json?    // source file/line citations returned with the answer
  createdAt     DateTime @default(now())

  @@index([chatSessionId])
  @@map("chat_message")
}

model CodeHealthSnapshot {
  id             String   @id @default(cuid())
  repoFullName   String
  complexityAvg  Float    // average cyclomatic complexity across synced files
  hotspotCount   Int      // files flagged as high churn + high complexity
  securityDebt   Int      // open (unresolved) SecurityFinding count
  testCoverageEst Float?  // estimated, not measured
  computedAt     DateTime @default(now())

  @@index([repoFullName])
  @@map("code_health_snapshot")
}
```

Also add a nullable `complexityScore Int?` and relations (`securityFindings`, `generatedTests`) to the existing `PullRequest` model.

---

## 5. New feature modules

```
features/
├── security/
│   ├── server/scan-pr.ts          # runs pattern + AI-based scan over PR diff
│   ├── rules/secrets.ts           # regex rules: AWS keys, private keys, tokens
│   ├── rules/patterns.ts          # SQLi/XSS/SSRF heuristic + AI-assisted rules
│   └── components/findings-list.tsx
├── test-gen/
│   ├── server/generate-tests.ts   # AI generates test file(s) per changed function
│   └── components/test-preview.tsx
├── chat/
│   ├── server/chat-with-repo.ts   # RAG: embed question -> Pinecone query -> generate w/ citations
│   ├── server/chat-stream-route.ts
│   └── components/chat-panel.tsx
├── code-health/
│   ├── server/compute-snapshot.ts # aggregates complexity/hotspots/security debt
│   └── components/health-dashboard.tsx
└── agent/
    └── orchestrator.ts            # graph: fetch -> chunk(tree-sitter) -> embed -> [review, scan, test-gen] in parallel -> persist
```

New API routes:
- `POST /api/security/scan` — trigger scan for a PR (also runs automatically in the Inngest review job)
- `POST /api/test-gen/generate` — generate tests for a PR's changed files
- `POST /api/chat/[repo]` — SSE chat endpoint (RAG over synced repo)
- `GET /api/code-health/[repo]` — latest health snapshot + trend

---

## 6. Hackathon timeline (assume a 36-hour event, team of 3–4)

**Hour 0–2 — Kickoff & scaffolding**
- Fork/branch, confirm `.env` (Groq + Gemini keys, Pinecone, GitHub App), run `docker compose up -d && npx prisma migrate dev`
- Add new Prisma models above, run migration
- Assign tracks: (A) Security Scanner, (B) Test Generator, (C) Chat-with-Repo, (D) Code Health Dashboard + demo repo prep

**Hour 2–10 — Track A: Security Scanner**
- Regex-based secret detection (AWS/GCP keys, private keys, generic high-entropy tokens) over the PR diff — fast, deterministic, good demo win
- AI-assisted pass for SQLi/XSS/SSRF/insecure-config using existing provider registry with a dedicated security prompt template (reuse `features/prompts` pattern)
- Persist `SecurityFinding` rows, render in PR review UI as a "Security" tab with severity badges
- Hook into Inngest review job so it runs automatically alongside the normal review

**Hour 2–10 — Track B: Test Case Generator**
- For each changed function (post Tree-sitter chunking), prompt the model to generate a unit test in the repo's detected framework (read `package.json`/`pyproject.toml` to guess Vitest/Jest/Pytest)
- Store as `GeneratedTest`, render a diff-style preview with a "Copy" / "Open PR with tests" button (stretch: actually commit via GitHub API)

**Hour 2–10 — Track C: Chat with Repository**
- Reuse `features/repo-sync` embeddings already in Pinecone
- Build `/api/chat/[repo]` SSE endpoint: embed the question, top-k retrieve from Pinecone namespaced by repo, generate an answer with inline file citations
- Simple chat UI panel in the dashboard (`features/chat/components/chat-panel.tsx`), reusing the existing `use-streaming-review` hook pattern

**Hour 2–10 — Track D: Code Health Dashboard + Tree-sitter chunking**
- Swap `chunk-code.ts` from naive line-splitting to `web-tree-sitter` AST-based chunking (functions/classes) — benefits both review quality and RAG retrieval quality
- Compute a `CodeHealthSnapshot` on each repo sync: avg complexity (cyclomatic via simple AST walk), hotspot files (churn × complexity), open security debt count
- New dashboard page: complexity trend line, hotspot list, security debt gauge

**Hour 10–12 — Integration checkpoint**
- Merge all branches, run `npm run lint && npx next build`
- Wire the four new features into a single PR page: tabs for **Review | Security | Tests | Chat**

**Hour 12–16 — MCP server + Gemini provider (stretch, if on schedule)**
- `features/ai/providers/gemini.ts` — add as provider #6
- `mcp/server.ts` exposing `review_pr`, `scan_security`, `generate_tests`, `chat_with_repo` as MCP tools

**Hour 16–20 — Polish pass**
- Empty states, loading skeletons, error boundaries on all 4 new pages (reuse existing error-boundary pattern)
- Seed a demo repo with an intentionally planted secret + a subtly buggy function + a missing test, so the demo has guaranteed findings

**Hour 20–24 — Demo prep & rehearsal**
- Record backup demo video (network/API flakiness insurance)
- Rehearse the 4-minute demo script (below) twice

**Remaining buffer — bug bash, judge Q&A prep**

---

## 7. Demo script (~4 minutes)

1. **(30s) Hook** — "Reviewing a PR today means reading a diff, guessing at security issues, and writing tests by hand. CodeLens AI does all three in the time it takes to get coffee."
2. **(45s) Open a real PR** on the seeded demo repo → show the **Review** tab streaming in plain-English explanation token-by-token.
3. **(45s) Security tab** — point to the planted leaked API key + a SQL-injection-shaped snippet, both flagged with severity + suggested fix.
4. **(45s) Tests tab** — show an auto-generated Vitest test for the new function, click "Copy to clipboard."
5. **(45s) Chat tab** — ask the repo a question unrelated to this PR ("where do we handle auth sessions?") and get a cited, sourced answer pulled from the whole indexed codebase.
6. **(30s) Code Health dashboard** — show the complexity/hotspot trend and mention it's computed on every sync, not just PRs.
7. **(20s) Close** — "One GitHub App install, five AI providers with automatic fallback, and now security, tests, and RAG chat — all shipped in this hackathon on top of a working review platform."

---

## 8. Judging-criteria alignment

| Criterion | How we hit it |
|---|---|
| **Technical depth** | Tree-sitter AST chunking, RAG with citations, MCP tool exposure, multi-provider fallback |
| **Real-world usefulness** | Built on an already-working GitHub App install flow — not a toy demo |
| **Completeness / polish** | Reuses existing auth, billing, error boundaries, dashboard shell — looks production-grade, not a hackathon hack |
| **Innovation** | Security + tests + chat unified into one PR review surface, plus MCP so it's usable from an agentic coding tool, not just a web UI |
| **Demo-ability** | Seeded demo repo guarantees findings appear live, no "trust me it works" |

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Live AI provider outage/rate-limit during demo | Groq + Gemini configured with automatic fallback (existing pattern in `features/ai/registry.ts`); backup recorded video |
| Tree-sitter grammar setup eats time | Scope to 2–3 languages max for the demo (TS/JS + Python); fall back to existing line-based chunker if it slips |
| Scope creep across 4 parallel tracks | Each track has a hard "must-ship" MVP (above) and an explicit stretch goal — cut stretch first |
| Pinecone quota/rate limits on repo sync | Use a small seeded demo repo (not a huge OSS repo) to keep sync fast and cheap |
| MCP server integration takes longer than budgeted | It's explicitly hour 12–16 stretch — cuttable without harming the core demo |

---

## 10. Stretch goals (post-hackathon / if time remains)

- Pluggable vector store interface (Pinecone / Qdrant / Chroma) behind one abstraction
- "Open PR with generated tests" — actually commit via GitHub API instead of copy-paste
- Review quality feedback loop (thumbs up/down) feeding a prompt-improvement dataset
- GitLab/Bitbucket webhook support (already on the existing `ROADMAP.md`)
- SBOM + dependency vulnerability scan as part of the Security tab
