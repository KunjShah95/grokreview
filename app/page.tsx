"use client";

import { UserMenuWithSession } from "@/features/auth/components/user-menu";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/reveal";
import {
  ArrowRight,
  GithubLogo,
  GitPullRequest,
  Cpu,
  Terminal as TerminalIcon,
  Check,
  Circle,
  Stack,
  ShieldCheck,
  ChartLineUp,
} from "@phosphor-icons/react";

/* ---------------------------------------------------------------------------
   GrokReview landing — "Light & Confident"
   One accent: indigo (--primary). Light theme locked. Dark panels carry the
   product surface. All product facts are real (models, CLI, GitHub-native flow).
--------------------------------------------------------------------------- */

const PROVIDERS = [
  { provider: "Groq", model: "llama-3.3-70b-versatile", tag: "fastest", active: true },
  { provider: "Mistral", model: "mistral-large-latest", tag: null, active: false },
  { provider: "OpenRouter", model: "deepseek/deepseek-r1", tag: null, active: false },
  { provider: "HuggingFace", model: "Qwen2.5-Coder-32B", tag: null, active: false },
  { provider: "Ollama", model: "qwen2.5-coder", tag: "local", active: false },
];

function ReviewPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-code-border bg-code text-code-foreground shadow-[0_24px_60px_-24px_rgba(30,27,75,0.35)]">
      {/* panel chrome */}
      <div className="flex items-center justify-between border-b border-code-border px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-xs text-code-muted">
          <GitPullRequest className="size-4 text-primary" weight="bold" />
          <span className="text-code-foreground">payments/refund-flow</span>
          <span>#284</span>
        </div>
        <span className="rounded-full bg-primary/15 px-2.5 py-1 font-mono text-[10px] text-primary">
          groq · llama-3.3-70b
        </span>
      </div>

      {/* diff */}
      <div className="px-4 pt-4 font-mono text-[12.5px] leading-relaxed">
        <div className="text-code-muted">lib/billing/refund.ts</div>
        <div className="mt-2 rounded-md bg-white/[0.02] p-3">
          <div className="text-code-muted">@@ verifyRefund() @@</div>
          <div className="text-rose-300/90">- if (amount &lt; order.total) refund(amount)</div>
          <div className="text-emerald-300/90">+ if (amount &gt; 0 &amp;&amp; amount &lt;= order.total) refund(amount)</div>
        </div>
      </div>

      {/* AI comment */}
      <div className="px-4 py-4">
        <div className="flex gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Cpu className="size-3.5" weight="bold" />
          </span>
          <div className="text-[13px] leading-relaxed text-code-foreground/85">
            <span className="font-medium text-code-foreground">Refunds above the order total slip through.</span>{" "}
            The guard only checks the lower bound, so a negative or oversized
            amount reaches <span className="font-mono text-code-foreground">refund()</span>. Clamp both ends before charging.
            <span className="caret text-primary" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelPicker() {
  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-[0_20px_50px_-30px_rgba(30,27,75,0.4)]">
      {PROVIDERS.map((p) => (
        <div
          key={p.provider}
          className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${
            p.active ? "bg-accent" : "hover:bg-secondary"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex size-8 items-center justify-center rounded-lg text-xs font-semibold ${
                p.active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {p.provider.slice(0, 2)}
            </span>
            <div className="leading-tight">
              <div className="text-sm font-medium text-foreground">{p.provider}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{p.model}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {p.tag && (
              <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {p.tag}
              </span>
            )}
            {p.active ? (
              <Check className="size-4 text-primary" weight="bold" />
            ) : (
              <Circle className="size-4 text-border" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  {
    icon: GithubLogo,
    title: "Connect a repository",
    body: "Install the GitHub App and pick the repos you want watched. No pipeline changes, no config files to babysit.",
  },
  {
    icon: Stack,
    title: "We index the whole codebase",
    body: "Every file is embedded so reviews reason about your actual patterns, not just the lines inside the diff.",
  },
  {
    icon: GitPullRequest,
    title: "Reviews land on every PR",
    body: "The moment a pull request opens, a review streams into the thread. Findings first, suggestions with real diffs.",
  },
];

function Terminal() {
  return (
    <div className="overflow-hidden rounded-2xl border border-code-border bg-code font-mono text-[12.5px] leading-relaxed text-code-foreground shadow-[0_24px_60px_-24px_rgba(30,27,75,0.4)]">
      <div className="flex items-center gap-1.5 border-b border-code-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
      </div>
      <div className="space-y-1 p-4">
        <div><span className="text-primary">$</span> npm i -g grokreview-cli</div>
        <div className="text-code-muted">added grokreview-cli, binary: pr-review</div>
        <div className="pt-2"><span className="text-primary">$</span> pr-review review acme/api#284 --model groq:llama3-70b</div>
        <div className="text-code-muted">→ indexing repository</div>
        <div className="text-code-muted">→ reviewing 7 changed files</div>
        <div className="text-emerald-300/90">✓ 2 findings, 1 suggestion</div>
        <div className="pt-2"><span className="text-primary">$</span> pr-review ci --fail-on-warnings</div>
        <div className="text-code-muted">exits non-zero when a critical issue is found<span className="caret text-primary" aria-hidden /></div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session } = authClient.useSession();
  const primaryHref = session?.user ? "/dashboard" : "/sign-in";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* faint indigo wash at the top, not a purple glow orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(79,70,229,0.07),transparent_70%)]"
      />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground">
            <Image src="/logo2.svg" alt="" width={18} height={18} className="invert" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">GrokReview</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#models" className="transition-colors hover:text-foreground">Models</a>
          <a href="#cli" className="transition-colors hover:text-foreground">CLI</a>
          <Link href="/blog" className="transition-colors hover:text-foreground">Blog</Link>
        </nav>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <UserMenuWithSession variant="compact" />
          ) : (
            <Link href="/sign-in" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
              Sign in
            </Link>
          )}
          <Link
            href={primaryHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-transform active:translate-y-px"
          >
            {session?.user ? "Dashboard" : "Get started"}
            <ArrowRight className="size-3.5" weight="bold" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl gap-14 px-6 pt-16 pb-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <GithubLogo className="size-3.5" weight="bold" /> Native GitHub reviews
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            Every pull request gets a{" "}
            <span className="text-primary">senior review.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            GrokReview reads your entire repo and reviews every PR the moment it
            opens. Bring your own model. No lock-in.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={primaryHref}
              className="group inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform active:translate-y-px"
            >
              {session?.user ? "Go to dashboard" : "Get started"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
            </Link>
            <a
              href="#how"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              See how it works
            </a>
          </div>
        </div>

        <Reveal className="lg:pl-4">
          <ReviewPanel />
        </Reveal>
      </section>

      {/* Compatibility band (under hero) */}
      <section className="relative z-10 border-y border-border bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">Works with the models your team already trusts</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-sm text-foreground/70">
            {["Groq", "Mistral", "OpenRouter", "HuggingFace", "Ollama"].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — stepped narrative (not 3 equal cards) */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            From install to first review in one pull request.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 90} className="bg-card p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                  <step.icon className="size-5" weight="bold" />
                </span>
                <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Model choice — split with real selector UI */}
      <section id="models" className="relative z-10 border-t border-border bg-card/50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <ModelPicker />
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Your model. Your call.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Route reviews through Groq for speed, a frontier model for depth, or
              a local Ollama model when the code cannot leave your machine. Switch
              per repository. Nothing is hard-wired.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Seven models across five providers, ready on day one",
                "Bring your own API keys, keep your own spend",
                "Run fully local with Ollama for private code",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" weight="bold" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Codebase-aware — reversed split */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16">
        <Reveal className="lg:order-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-primary" weight="bold" />
              Context pulled for this review
            </div>
            <div className="mt-4 space-y-2">
              {[
                { f: "lib/billing/refund.ts", r: "changed in PR" },
                { f: "lib/billing/types.ts", r: "defines Order" },
                { f: "lib/billing/ledger.ts", r: "calls refund()" },
                { f: "tests/refund.spec.ts", r: "covers this path" },
              ].map((row) => (
                <div key={row.f} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                  <span className="font-mono text-[12.5px] text-foreground">{row.f}</span>
                  <span className="text-[11px] text-muted-foreground">{row.r}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={80} className="lg:order-1">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            It reads the code around the code.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Most tools see the diff and nothing else. GrokReview embeds your whole
            repository, then retrieves the files that actually matter for each
            change. Reviews catch the callers, the types, and the tests the diff
            never mentions.
          </p>
        </Reveal>
      </section>

      {/* CLI — full-width dark section */}
      <section id="cli" className="relative z-10 bg-code text-code-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-code-border px-3 py-1 font-mono text-xs text-code-muted">
              <TerminalIcon className="size-3.5" weight="bold" /> pr-review
            </span>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">
              Same reviews, straight from your terminal.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-code-foreground/70">
              Review a PR by hand, batch every open one, or wire it into CI as a
              gate that fails on critical findings. The CLI shares the engine, so
              local and automated reviews always agree.
            </p>
          </div>
          <Reveal delay={60}>
            <Terminal />
          </Reveal>
        </div>
      </section>

      {/* Analytics teaser + CTA band */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl border border-border bg-card px-8 py-14 text-center shadow-[0_30px_80px_-40px_rgba(30,27,75,0.4)]">
          <ChartLineUp className="mx-auto size-6 text-primary" weight="bold" />
          <h2 className="mx-auto mt-5 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Start reviewing your next pull request.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Connect a repository and watch the first review stream in. Free to
            start, no credit card.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href={primaryHref}
              className="group inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-7 text-sm font-medium text-primary-foreground transition-transform active:translate-y-px"
            >
              {session?.user ? "Go to dashboard" : "Get started"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-6 items-center justify-center rounded-md bg-foreground">
              <Image src="/logo2.svg" alt="" width={13} height={13} className="invert" />
            </span>
            GrokReview
          </div>
          <nav className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/blog" className="transition-colors hover:text-foreground">Blog</Link>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <Link href="/sign-in" className="transition-colors hover:text-foreground">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
