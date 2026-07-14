import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { POSTS, formatPostDate } from "@/lib/blog";
import { Reveal } from "@/components/reveal";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on code review, model choice, and shipping with confidence from the team building GrokReview.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "GrokReview Blog",
    description:
      "Notes on code review, model choice, and shipping with confidence.",
  },
};

function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
          <Image src="/logo2.svg" alt="" width={18} height={18} className="invert" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">GrokReview</span>
      </Link>
      <Link
        href="/sign-in"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-transform active:translate-y-px"
      >
        Get started
        <ArrowRight className="size-3.5" weight="bold" />
      </Link>
    </header>
  );
}

export default function BlogIndex() {
  const posts = [...POSTS].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Reveal>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Writing</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Field notes on reviewing code well: context over diffs, model choice
            over lock-in, and consistency over heroics.
          </p>
        </Reveal>

        <div className="mt-14 divide-y divide-border border-t border-border">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 70}>
              <Link href={`/blog/${post.slug}`} className="group block py-8">
                <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-primary">{post.tag}</span>
                  <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                  <span>{post.readingMinutes} min read</span>
                </div>
                <h2 className="mt-3 flex items-start gap-2 text-2xl font-medium tracking-tight">
                  <span className="transition-colors group-hover:text-primary">{post.title}</span>
                  <ArrowUpRight className="mt-1.5 size-5 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" weight="bold" />
                </h2>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                  {post.description}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </main>
    </div>
  );
}
