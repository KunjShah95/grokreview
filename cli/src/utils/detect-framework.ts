export type FrameworkInfo = { framework: string; hint: string };

const EXTENSION_HINT: Array<{ extensions: string[]; framework: string; hint: string }> = [
  { extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"], framework: "vitest", hint: "Use Vitest (`import { describe, it, expect } from 'vitest'`)." },
  { extensions: [".py"], framework: "pytest", hint: "Use pytest (plain `def test_...` functions with `assert`)." },
  { extensions: [".go"], framework: "go-test", hint: "Use Go's standard `testing` package." },
  { extensions: [".java", ".kt"], framework: "junit", hint: "Use JUnit 5 (`@Test` annotations)." },
  { extensions: [".rb"], framework: "rspec", hint: "Use RSpec (`describe`/`it` blocks)." },
];

export function detectFramework(filePath: string): FrameworkInfo | null {
  return EXTENSION_HINT.find((entry) => entry.extensions.some((ext) => filePath.endsWith(ext))) ?? null;
}

export function isAlreadyATest(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    /\.(test|spec)\.[jt]sx?$/.test(lower) ||
    /(^|\/)test_.*\.py$/.test(lower) ||
    /_test\.go$/.test(lower) ||
    lower.includes("__tests__/") ||
    lower.includes("/tests/")
  );
}
