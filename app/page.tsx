"use client";
import { UserMenuWithSession } from "@/features/auth/components/user-menu";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GithubLogo, Brain, ShieldCheck, Lightning } from "@phosphor-icons/react";

export default function Home() {
  const { data: session } = authClient.useSession();

  return (
    <div className="relative flex flex-col items-center bg-[#050505] text-white overflow-hidden min-h-[100dvh]">
      {/* Background glow orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[30%] -right-[20%] w-[600px] h-[600px] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[20%] w-[500px] h-[500px] rounded-full bg-emerald-500/15 blur-[100px]" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 w-full flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
            <Image src="/logo2.svg" alt="" width={38} height={38} className="invert" />
          </span>
          <span className="text-sm font-medium">GrokReview</span>
        </div>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              Dashboard
              <ArrowRight className="size-3" />
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="size-3" />
            </Link>
          )}
          <UserMenuWithSession variant="compact" />
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <span className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
          AI-Powered Code Review
        </span>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          Review PRs with
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-emerald-300 to-blue-400 bg-clip-text text-transparent">
            any AI model you choose
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/50">
          Connect your GitHub repositories and get intelligent, actionable
          feedback on every pull request. Works with Groq, OpenRouter, Mistral,
          HuggingFace, or local Ollama models.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href={session?.user ? "/dashboard" : "/sign-in"}
            className="group relative inline-flex h-11 items-center gap-2 rounded-full bg-white px-7 text-sm font-medium text-black transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            {session?.user ? "Go to Dashboard" : "Start Reviewing Free"}
            <span className="flex size-5 items-center justify-center rounded-full bg-black/10 transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-3" />
            </span>
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <span className="flex size-1.5 rounded-full bg-emerald-400" />
            No credit card required
          </div>
        </div>
      </section>

      {/* Features Grid - Bento Style */}
      <section className="relative z-10 w-full max-w-5xl px-6 pb-32">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Large card */}
          <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-8 backdrop-blur-xl transition-all hover:border-white/10 md:col-span-7 md:row-span-2">
            <div className="absolute -right-10 -top-10 size-32 rounded-full bg-purple-500/10 blur-[60px] transition-all group-hover:bg-purple-500/20" />
            <div className="relative z-10">
              <span className="mb-4 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Brain className="size-5 text-purple-300" />
              </span>
              <h3 className="text-lg font-semibold">Multi-Model AI</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                Choose from 7+ free AI models across 5 providers. Groq for
                lightning-fast reviews, Ollama for fully local processing, or
                OpenRouter for maximum model selection. No vendor lock-in.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Groq", "Mistral", "OpenRouter", "Ollama", "HuggingFace"].map((name) => (
                  <span
                    key={name}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium text-white/60"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Small card */}
          <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl transition-all hover:border-white/10 md:col-span-5">
            <span className="mb-3 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Lightning className="size-4 text-emerald-300" />
            </span>
            <h3 className="text-sm font-semibold">Auto-Review</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Every PR is reviewed automatically on open. No manual triggers needed.
            </p>
          </div>

          {/* Small card */}
          <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl transition-all hover:border-white/10 md:col-span-5">
            <span className="mb-3 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <ShieldCheck className="size-4 text-blue-300" />
            </span>
            <h3 className="text-sm font-semibold">Codebase-Aware</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Syncs your entire codebase for context-aware reviews.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
