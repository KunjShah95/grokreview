export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "quote"; text: string }
  | { type: "code"; lang: string; text: string }
  | { type: "ul"; items: string[] };

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  readingMinutes: number;
  tag: string;
  body: Block[];
};

export const POSTS: Post[] = [
  {
    slug: "diff-only-review-misses-the-bug",
    title: "Diff-only review misses the bug",
    description:
      "The lines in a pull request rarely contain the reason a change is wrong. Reviewing with full repository context is the difference between a linter and a reviewer.",
    date: "2026-06-18",
    readingMinutes: 5,
    tag: "Engineering",
    body: [
      {
        type: "p",
        text: "A pull request shows you what changed. It almost never shows you why the change is a problem. The caller that now receives a null, the type that quietly widened, the test that stopped asserting anything useful: none of that lives inside the diff. It lives three files away.",
      },
      {
        type: "p",
        text: "Most automated review tools read the patch and nothing else. They are fast and they are confident, and they are blind to everything outside the changed hunks. That is why they catch style and miss substance.",
      },
      { type: "h2", text: "A worked example" },
      {
        type: "p",
        text: "Consider a one-line change to a refund guard. On its own it looks defensive and correct.",
      },
      {
        type: "code",
        lang: "diff",
        text: "- if (amount < order.total) refund(amount)\n+ if (amount > 0 && amount <= order.total) refund(amount)",
      },
      {
        type: "p",
        text: "The diff reads fine. The bug is that a second caller in the ledger module passes a signed amount, and the new lower bound silently drops legitimate reversals. You cannot see that from the patch. You can only see it if you read the code that calls the code.",
      },
      { type: "h2", text: "Context is the whole job" },
      {
        type: "p",
        text: "GrokReview embeds your entire repository, then retrieves the files that actually matter for a given change: the callers, the shared types, the tests that cover the path. The review reasons about the change the way a senior engineer would, with the surrounding code open in another tab.",
      },
      {
        type: "quote",
        text: "A reviewer who only reads the diff is a linter with better grammar.",
      },
      {
        type: "p",
        text: "That is the line we care about. Fast feedback is table stakes. Feedback that understands the blast radius of a change is the part worth paying attention to.",
      },
    ],
  },
  {
    slug: "bring-your-own-model",
    title: "Bring your own model",
    description:
      "One reviewer should not mean one vendor. Route reviews through the model that fits the repository, the budget, and the privacy bar, and switch whenever that changes.",
    date: "2026-05-27",
    readingMinutes: 4,
    tag: "Product",
    body: [
      {
        type: "p",
        text: "Model quality moves every few weeks. Pricing moves with it. Locking a review tool to a single provider means inheriting someone else's roadmap and someone else's bill. We decided early that the model should be your choice, per repository, changeable at any time.",
      },
      { type: "h2", text: "What that looks like" },
      {
        type: "ul",
        items: [
          "Groq when you want a review back before you have finished reading the PR yourself.",
          "A frontier model on OpenRouter when the change is subtle and depth matters more than speed.",
          "A local Ollama model when the code is not allowed to leave the machine.",
        ],
      },
      {
        type: "p",
        text: "You bring the API keys, so you keep the spend and the rate limits. Nothing is marked up, and nothing is hard-wired.",
      },
      {
        type: "code",
        lang: "bash",
        text: "pr-review review acme/api#284 --model groq:llama3-70b\npr-review review acme/api#284 --model ollama:qwen2.5-coder",
      },
      { type: "h2", text: "Why local matters" },
      {
        type: "p",
        text: "For a lot of teams, the blocker on AI review was never quality. It was that the code could not be sent to a third party at all. Running the same review engine against a local model removes that objection without asking anyone to lower the privacy bar.",
      },
    ],
  },
  {
    slug: "review-every-pull-request",
    title: "Review every pull request, not the ones you remember",
    description:
      "Manual review is uneven by nature. The value of automated review is not that it is smarter than a person, but that it never gets tired, distracted, or busy.",
    date: "2026-04-30",
    readingMinutes: 4,
    tag: "Workflow",
    body: [
      {
        type: "p",
        text: "The pull requests that ship bugs are not usually the big ones. They are the small ones that went out on a Friday, the config tweak nobody thought needed eyes, the hotfix reviewed in thirty seconds because the site was down.",
      },
      {
        type: "p",
        text: "Human review is uneven because humans are uneven. Attention is finite and unfairly distributed across a day. Automated review is valuable precisely because it is boringly consistent: every PR, the same depth, the moment it opens.",
      },
      { type: "h2", text: "It arrives where the work is" },
      {
        type: "p",
        text: "GrokReview posts into the pull request itself, streaming as it goes. Findings first, then suggestions with real diffs you can apply. No new dashboard to check, no separate queue to drain. The review shows up in the thread where the conversation already lives.",
      },
      {
        type: "quote",
        text: "Consistency beats brilliance when the brilliance only shows up on the PRs you happened to notice.",
      },
      {
        type: "p",
        text: "Wire it into CI as a gate and it becomes a floor under quality rather than a nice-to-have. Critical finding, non-zero exit, conversation happens before merge instead of after the incident.",
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
