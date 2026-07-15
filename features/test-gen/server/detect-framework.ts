import type { TestFramework } from "../types";

const EXTENSION_FRAMEWORK: Array<{ extensions: string[]; framework: TestFramework }> = [
  { extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs"], framework: "vitest" },
  { extensions: [".py"], framework: "pytest" },
  { extensions: [".go"], framework: "go-test" },
  { extensions: [".java", ".kt"], framework: "junit" },
  { extensions: [".rb"], framework: "rspec" },
];

/** Best-effort test framework detection based on a changed file's extension. */
export function detectFrameworkForFile(filePath: string): TestFramework | null {
  const match = EXTENSION_FRAMEWORK.find((entry) =>
    entry.extensions.some((ext) => filePath.endsWith(ext))
  );
  return match?.framework ?? null;
}

/** Whether a file is a source file worth generating tests for (skips existing tests, configs, styles, etc). */
export function isTestableSourceFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  const isAlreadyATest =
    /\.(test|spec)\.[jt]sx?$/.test(lower) ||
    /(^|\/)test_.*\.py$/.test(lower) ||
    /_test\.go$/.test(lower) ||
    lower.includes("__tests__/") ||
    lower.includes("/tests/");

  if (isAlreadyATest) {
    return false;
  }

  return detectFrameworkForFile(filePath) !== null;
}

function buildJsTestPath(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  const withoutExt = filePath.slice(0, lastDot);
  const ext = filePath.slice(lastDot);
  return `${withoutExt}.test${ext}`;
}

export function buildTestFilePath(filePath: string, framework: TestFramework): string {
  switch (framework) {
    case "vitest":
    case "jest":
      return buildJsTestPath(filePath);
    case "pytest": {
      const parts = filePath.split("/");
      const fileName = parts.pop() ?? filePath;
      return [...parts, `test_${fileName}`].join("/");
    }
    case "go-test":
      return filePath.replace(/\.go$/, "_test.go");
    case "junit": {
      const lastDot = filePath.lastIndexOf(".");
      return `${filePath.slice(0, lastDot)}Test${filePath.slice(lastDot)}`;
    }
    case "rspec":
      return filePath.replace(/\.rb$/, "_spec.rb");
    default:
      return `${filePath}.test`;
  }
}
