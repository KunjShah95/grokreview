## Summary

This PR consolidates all infrastructure and feature work from the latest session.

### 🚀 Features
- **Formal PR Reviews** — GitHub Reviews API instead of plain comments. Falls back to comments on error.
- **Model Filtering** — Filter PR history by AI model used (dropdown in toolbar).
- **Popular Model Card** — Dashboard shows the most-used AI model with usage percentage.
- **Usage Alert Emails** — Automated Resend-based email alerts at 80% and 100% limits.

### 🛠️ Infrastructure
- **CI/CD Pipeline** — Build, lint, type-check on every PR. Vercel deploy on master.
- **Unit Tests** — Vitest setup with tests for `cn()` utility. `npm test` in CI.
- **Branch Protection** — Master requires CI to pass and PR review before merging.
- **README Badges** — CI/CD status, release version, license.
- **CONTRIBUTING.md** — Full contributing guide with conventions and workflows.
