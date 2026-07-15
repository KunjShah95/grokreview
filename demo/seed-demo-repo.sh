#!/usr/bin/env bash
# Scaffolds a throwaway demo repository with a clean baseline commit, then a
# second commit (on its own branch) that deliberately trips every GrokReview
# feature: a leaked secret (blocks merge), a SQL-injection heuristic
# (comment-only), an off-by-one bug (AI review bait + missing test), and a
# small auth module (so Chat with Repo has something real to answer).
#
# Usage:
#   ./seed-demo-repo.sh [target-dir]
#
# Then push target-dir to a fresh GitHub repo, install the GrokReview GitHub
# App on it, sync it from the dashboard (for Chat/Code Health), and open a
# PR from `demo/security-and-bugs` against `main`. See DEMO_SCRIPT.md.

set -euo pipefail

TARGET_DIR="${1:-./grokreview-demo}"

if [ -e "$TARGET_DIR" ]; then
  echo "Error: $TARGET_DIR already exists. Remove it or pass a different path." >&2
  exit 1
fi

mkdir -p "$TARGET_DIR/src"
cd "$TARGET_DIR"
git init -q
git checkout -q -b main

cat > package.json << 'EOF'
{
  "name": "grokreview-demo",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^4.0.0"
  }
}
EOF

cat > src/auth.js << 'EOF'
// Minimal session auth used across the demo app.
export function authenticate(request, sessionStore) {
  const token = request.headers["authorization"]?.replace("Bearer ", "");
  if (!token) {
    return null;
  }
  return sessionStore.get(token) ?? null;
}

export function requireAuth(request, sessionStore) {
  const session = authenticate(request, sessionStore);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
EOF

cat > src/db.js << 'EOF'
// Simple data-access helpers.
export function getUserById(db, id) {
  return db.query("SELECT * FROM users WHERE id = $1", [id]);
}
EOF

cat > README.md << 'EOF'
# grokreview-demo

Throwaway fixture repo for demoing GrokReview live. See the parent repo's
`demo/DEMO_SCRIPT.md` for the walkthrough this pairs with.
EOF

git add -A
git commit -q -m "Initial commit: auth + db helpers"

git checkout -q -b demo/security-and-bugs

cat > src/config.js << 'EOF'
// Demo-only fake credential (AWS's own well-known placeholder key) — this
// is what the security scanner should flag as CRITICAL and block the merge.
export const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";

export const config = {
  region: "us-east-1",
  timeout: 5000,
};
EOF

cat > src/search.js << 'EOF'
// Demo-only SQL-injection SHAPE — string concatenation instead of a
// parameterized query. The scanner should flag this as a heuristic
// finding (comment-only, not merge-blocking — it's a pattern match, not
// a certainty).
export function findUserByName(db, name) {
  return db.query("SELECT * FROM users WHERE name = '" + name + "'");
}
EOF

cat > src/math.js << 'EOF'
// Demo-only off-by-one bug: the loop reads one index past the end of the
// array (numbers[numbers.length] is undefined), so the sum is NaN for any
// non-empty input. Good AI-review bait, and a clean target for the test
// generator since there's no existing test for this function.
export function average(numbers) {
  let sum = 0;
  for (let i = 0; i <= numbers.length; i++) {
    sum += numbers[i];
  }
  return sum / numbers.length;
}
EOF

git add -A
git commit -q -m "Add config, search, and averaging helpers"

cat << MSG

Demo repo created at: $TARGET_DIR

Branches:
  main                       — clean baseline (auth.js, db.js)
  demo/security-and-bugs     — planted secret, SQLi pattern, off-by-one bug

Next steps:
  1. Create a new GitHub repo and push both branches:
       cd $TARGET_DIR
       git remote add origin <your-new-repo-url>
       git push -u origin main
       git push -u origin demo/security-and-bugs
  2. Install the GrokReview GitHub App on the new repo.
  3. Sync the repo from the dashboard (Repositories -> Sync) so Chat and
     Code Health have something indexed.
  4. Open a PR: demo/security-and-bugs -> main. GrokReview should:
       - post an AI review flagging the off-by-one bug
       - post a CRITICAL security finding for the AWS key (REQUEST_CHANGES)
       - post a comment-only finding for the SQL-injection shape
       - generate a unit test for average() (and ideally catch the bug)
  5. In Chat with Repo, ask: "how does auth work here?" — expect a grounded
     answer citing src/auth.js.

See demo/DEMO_SCRIPT.md in the GrokReview repo for the full walkthrough.
MSG
