# Live Demo Script (~4 minutes)

Pairs with `demo/seed-demo-repo.sh`, which scaffolds a throwaway fixture repo that guarantees every
feature below actually fires — no "hope the AI finds something interesting" risk during a live demo.

## Setup (do this before you're on stage)

```bash
./demo/seed-demo-repo.sh ~/grokreview-demo
cd ~/grokreview-demo
# create a new repo on GitHub, then:
git remote add origin <your-new-repo-url>
git push -u origin main
git push -u origin demo/security-and-bugs
```

1. Install the GrokReview GitHub App on the new repo.
2. From the dashboard: **Repositories → Sync** on the new repo (needed for Chat and Code Health).
3. Open a PR: `demo/security-and-bugs` → `main`. Let GrokReview finish reviewing it *before* you go on
   stage — reviews take a few seconds to a couple of minutes depending on the provider, and you don't
   want dead air waiting on an API call during the actual demo.
4. Record a ~90s screen-capture backup of everything below, in case of network/API flakiness live.

## The walkthrough

**(30s) Hook** — "Reviewing a PR well means reading the diff, guessing at security issues, and writing
tests by hand. This does all three in about the time it takes to open the PR."

**(45s) Review tab** — Open the seeded PR. Point at the AI review calling out the off-by-one bug in
`average()` (`numbers[numbers.length]` reads past the array). This is the model actually reasoning about
the code, not a template — read a line of it out loud.

**(45s) Security tab** — Two findings, two different treatments:
- 🔴 **CRITICAL** — the planted AWS key in `config.js`, review escalated to **Request Changes**. Say
  explicitly: *"this is the only category allowed to block a merge — leaked secrets have basically zero
  false positives."*
- 🟡 **comment-only** — the SQL-injection shape in `search.js`. Say: *"heuristic patterns like this can
  misfire, so they stay advisory instead of blocking."* This contrast is the actual design story, not
  just a feature list — say it out loud.

**(45s) Tests tab** — Show the generated Vitest test for `average()`. If it happens to assert on the
buggy behavior, even better — point out that a real test suite would have caught this bug before merge,
which is the whole pitch.

**(45s) Chat tab** — Ask: *"How does auth work in this repo?"* Expect an answer grounded in
`src/auth.js` with a file citation attached — not a generic answer. This is the moment that shows it
actually understands the whole repo, not just the diff.

**(30s) Code Health** — Show the dashboard for the repo: complexity trend, hotspot files, open security
debt. Say: *"this runs on every sync, not just PRs — it's watching the whole codebase, continuously."*

**(20s) Close** — "One GitHub App install, six AI providers with automatic fallback, a CLI, and an MCP
server so the same engine works from Claude Code or a terminal — not just this dashboard."

## If something doesn't cooperate live

- **Review/scan didn't finish in time** — switch to the pre-recorded backup video immediately; don't
  narrate a spinner.
- **A provider is rate-limited** — this is the actual point of the fallback design; say so, then show
  the backup video if it doesn't recover within a few seconds.
- **Chat gives a vague answer** — the repo may not have finished syncing. Confirm sync status on the
  Repositories page before going live next time; fall back to the video for this segment.
