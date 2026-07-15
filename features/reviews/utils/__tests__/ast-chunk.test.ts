import { describe, it, expect } from "vitest";
import { getAstBoundaries, detectAstLanguage, buildChunkRanges } from "../ast-chunk";

describe("detectAstLanguage", () => {
  it("maps known extensions to a language", () => {
    expect(detectAstLanguage("src/foo.ts")).toBe("typescript");
    expect(detectAstLanguage("src/foo.tsx")).toBe("tsx");
    expect(detectAstLanguage("src/foo.js")).toBe("javascript");
    expect(detectAstLanguage("src/foo.py")).toBe("python");
  });

  it("returns null for unsupported extensions", () => {
    expect(detectAstLanguage("README.md")).toBeNull();
    expect(detectAstLanguage("src/foo.go")).toBeNull();
    expect(detectAstLanguage("noextension")).toBeNull();
  });
});

describe("getAstBoundaries", () => {
  it("returns null for unsupported languages", async () => {
    expect(await getAstBoundaries("README.md", "# hello")).toBeNull();
  });

  it("finds top-level functions and classes in TypeScript", async () => {
    const source = `
export function add(a: number, b: number) {
  return a + b;
}

export class Widget {
  increment() {
    return 1;
  }

  reset(): void {
    return;
  }
}
`;
    const boundaries = await getAstBoundaries("widget.ts", source);
    expect(boundaries).not.toBeNull();

    const types = boundaries!.map((b) => b.nodeType);
    expect(types).toContain("function_declaration");
    expect(types).toContain("class_declaration");
    // Both class methods should be captured as their own boundaries
    expect(types.filter((t) => t === "method_definition")).toHaveLength(2);
  });

  it("finds `export const foo = () => {}` as a chunkable declaration", async () => {
    const source = `export const add = (a: number, b: number) => a + b;`;
    const boundaries = await getAstBoundaries("math.ts", source);
    expect(boundaries).not.toBeNull();
    expect(boundaries!.some((b) => b.nodeType === "variable_function")).toBe(true);
  });

  it("finds functions and classes in Python", async () => {
    const source = `
def add(a, b):
    return a + b


class Widget:
    def increment(self):
        self.count += 1

    def reset(self):
        self.count = 0
`;
    const boundaries = await getAstBoundaries("widget.py", source);
    expect(boundaries).not.toBeNull();

    const types = boundaries!.map((b) => b.nodeType);
    expect(types).toContain("function_definition"); // top-level `add`
    expect(types).toContain("class_definition");
    // Both class methods are also function_definition nodes
    expect(types.filter((t) => t === "function_definition")).toHaveLength(3);
  });

  it("reports accurate start/end line ranges", async () => {
    const source = `function first() {\n  return 1;\n}\n\nfunction second() {\n  return 2;\n}\n`;
    const boundaries = await getAstBoundaries("lines.js", source);
    expect(boundaries).toEqual([
      { startLine: 0, endLine: 2, nodeType: "function_declaration", scope: "top-level" },
      { startLine: 4, endLine: 6, nodeType: "function_declaration", scope: "top-level" },
    ]);
  });

  it("does not throw on syntactically invalid source, and still returns something", async () => {
    // Tree-sitter is error-tolerant; this should not throw even though
    // the code is broken. It should still parse the valid function.
    const source = `function ok() { return 1; }\nfunction broken( { `;
    await expect(getAstBoundaries("broken.js", source)).resolves.not.toThrow();
  });
});

describe("buildChunkRanges", () => {
  it("covers the whole file: gap before, the declaration, gap after", () => {
    // 10 lines total; a function spans lines 3-5 (0-indexed)
    const ranges = buildChunkRanges(10, [
      { startLine: 3, endLine: 5, nodeType: "function_declaration", scope: "top-level" },
    ], 80);

    expect(ranges).toEqual([
      { startLine: 0, endLine: 2 }, // gap before
      { startLine: 3, endLine: 5 }, // the function itself
      { startLine: 6, endLine: 9 }, // gap after
    ]);
  });

  it("does not duplicate a gap when the declaration starts at line 0", () => {
    const ranges = buildChunkRanges(5, [
      { startLine: 0, endLine: 4, nodeType: "function_declaration", scope: "top-level" },
    ], 80);
    expect(ranges).toEqual([{ startLine: 0, endLine: 4 }]);
  });

  it("splits an oversized declaration into windows", () => {
    // maxLines=10, span of 35 lines exceeds the 3x safety threshold (30)
    const ranges = buildChunkRanges(35, [
      { startLine: 0, endLine: 34, nodeType: "class_declaration", scope: "top-level" },
    ], 10);

    expect(ranges).toEqual([
      { startLine: 0, endLine: 9 },
      { startLine: 10, endLine: 19 },
      { startLine: 20, endLine: 29 },
      { startLine: 30, endLine: 34 },
    ]);
  });

  it("appends member (method) ranges after top-level coverage", () => {
    const ranges = buildChunkRanges(10, [
      { startLine: 0, endLine: 9, nodeType: "class_declaration", scope: "top-level" },
      { startLine: 1, endLine: 3, nodeType: "method_definition", scope: "member" },
      { startLine: 5, endLine: 7, nodeType: "method_definition", scope: "member" },
    ], 80);

    expect(ranges).toEqual([
      { startLine: 0, endLine: 9 },
      { startLine: 1, endLine: 3 },
      { startLine: 5, endLine: 7 },
    ]);
  });

  it("handles no boundaries at all — pure line windowing", () => {
    const ranges = buildChunkRanges(25, [], 10);
    expect(ranges).toEqual([
      { startLine: 0, endLine: 9 },
      { startLine: 10, endLine: 19 },
      { startLine: 20, endLine: 24 },
    ]);
  });
});
