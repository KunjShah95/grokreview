import { requireUnauth } from "@/features/auth/actions";
import Image from "next/image";
import Link from "next/link";
import { GitPullRequest, Cpu, Check } from "@phosphor-icons/react/dist/ssr";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUnauth();

  return (
    <div className="grid min-h-[100dvh] flex-1 lg:grid-cols-2">
      {/* Story panel — the product moment, on the dark surface */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-code p-12 text-code-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(79,70,229,0.18),transparent_70%)]"
        />
        <Link href="/" className="relative z-10 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
            <Image src="/logo2.svg" alt="" width={18} height={18} className="invert" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">GrokReview</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="rounded-2xl border border-code-border bg-white/[0.03] p-5">
            <div className="flex items-center gap-2 font-mono text-xs text-code-muted">
              <GitPullRequest className="size-4 text-primary" weight="bold" />
              payments/refund-flow #284
            </div>
            <div className="mt-4 flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Cpu className="size-3.5" weight="bold" />
              </span>
              <p className="text-[13px] leading-relaxed text-code-foreground/85">
                <span className="font-medium text-code-foreground">Refunds above the order total slip through.</span>{" "}
                Clamp both ends before charging.
                <span className="caret text-primary" aria-hidden />
              </p>
            </div>
          </div>

          <h2 className="mt-10 text-2xl font-semibold leading-snug tracking-tight">
            Every pull request gets a senior review.
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-code-foreground/70">
            {[
              "Reviews on every PR, the moment it opens",
              "Full codebase context, not just the diff",
              "Bring your own model. No lock-in.",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" weight="bold" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 font-mono text-xs text-code-muted">
          Trusted with your code. Read-only by default.
        </p>
      </aside>

      {/* Auth card */}
      <main className="flex flex-col items-center justify-center bg-background px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground">
            <Image src="/logo2.svg" alt="" width={18} height={18} className="invert" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">GrokReview</span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
