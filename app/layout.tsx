import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://grokreview.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GrokReview - AI code review that reads your whole repo",
    template: "%s · GrokReview",
  },
  description:
    "GrokReview reviews every pull request the moment it opens, with full codebase context. Bring your own model: Groq, Mistral, OpenRouter, HuggingFace, or local Ollama. No lock-in.",
  keywords: [
    "AI code review",
    "pull request review",
    "GitHub code review",
    "automated PR review",
    "codebase-aware review",
    "Groq",
    "Ollama",
    "OpenRouter",
  ],
  authors: [{ name: "GrokReview" }],
  applicationName: "GrokReview",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "GrokReview",
    title: "GrokReview - AI code review that reads your whole repo",
    description:
      "Reviews every pull request the moment it opens, with full codebase context. Bring your own model. No lock-in.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GrokReview - AI code review that reads your whole repo",
    description:
      "Reviews every pull request the moment it opens, with full codebase context. Bring your own model. No lock-in.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans"
      )}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
