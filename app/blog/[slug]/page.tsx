import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { POSTS, getPost, formatPostDate, type Block } from "@/lib/blog";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://grokreview.dev";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      url: `${SITE_URL}/blog/${post.slug}`,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-12 text-xl font-semibold tracking-tight">{block.text}</h2>;
    case "p":
      return <p className="mt-5 text-[17px] leading-[1.75] text-foreground/80">{block.text}</p>;
    case "quote":
      return (
        <blockquote className="mt-8 border-l-2 border-primary pl-5 text-[19px] font-medium leading-relaxed tracking-tight text-foreground">
          {block.text}
        </blockquote>
      );
    case "ul":
      return (
        <ul className="mt-5 space-y-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-[17px] leading-relaxed text-foreground/80">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre className="mt-6 overflow-x-auto rounded-xl border border-code-border bg-code p-4 font-mono text-[13px] leading-relaxed text-code-foreground">
          <code>{block.text}</code>
        </pre>
      );
  }
}

export default async function BlogPost({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "GrokReview" },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mx-auto flex h-16 max-w-2xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Image src="/logo2.svg" alt="" width={18} height={18} className="invert" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">GrokReview</span>
        </Link>
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" weight="bold" /> All writing
        </Link>
      </header>

      <article className="mx-auto max-w-2xl px-6 py-14">
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-primary">{post.tag}</span>
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          <span>{post.readingMinutes} min read</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{post.description}</p>

        <div className="mt-10 border-t border-border pt-2">
          {post.body.map((block, i) => (
            <BlockRenderer key={i} block={block} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight">See it on your next pull request.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Connect a repository and watch the first review stream in. Free to start.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-transform active:translate-y-px"
          >
            Get started
            <ArrowRight className="size-4" weight="bold" />
          </Link>
        </div>
      </article>
    </div>
  );
}
