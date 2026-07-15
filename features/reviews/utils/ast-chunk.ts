import { Parser, Language, type Node as TSNode } from "web-tree-sitter";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

type SupportedLang = "javascript" | "typescript" | "tsx" | "python";

// Resolved via each package's package.json (not the .wasm file directly) so
// bundlers that statically follow require.resolve() — Turbopack in
// particular — don't try to treat the .wasm as an importable WASM module to
// transform. We just want the raw file path to read bytes from at runtime.
const LANG_WASM_FILE: Record<SupportedLang, { pkg: string; file: string }> = {
  javascript: { pkg: "tree-sitter-javascript", file: "tree-sitter-javascript.wasm" },
  typescript: { pkg: "tree-sitter-typescript", file: "tree-sitter-typescript.wasm" },
  tsx: { pkg: "tree-sitter-typescript", file: "tree-sitter-tsx.wasm" },
  python: { pkg: "tree-sitter-python", file: "tree-sitter-python.wasm" },
};

function resolveWasmPath(lang: SupportedLang): string {
  const { pkg, file } = LANG_WASM_FILE[lang];
  // turbopackIgnore: the dynamic require.resolve() below can't be statically
  // traced by Turbopack, which otherwise falls back to tracing the entire
  // project for any route that imports this module. The .wasm files this
  // resolves to are already explicitly listed in next.config.ts's
  // outputFileTracingIncludes, so they ship regardless.
  const pkgJsonPath = require.resolve(/* turbopackIgnore: true */ `${pkg}/package.json`);
  return join(dirname(pkgJsonPath), file);
}

const EXTENSION_LANG: Record<string, SupportedLang> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".py": "python",
};

/** Node types that stand alone as a chunkable top-level declaration. */
const TOP_LEVEL_TYPES: Record<SupportedLang, Set<string>> = {
  javascript: new Set(["function_declaration", "class_declaration"]),
  typescript: new Set(["function_declaration", "class_declaration", "interface_declaration", "type_alias_declaration"]),
  tsx: new Set(["function_declaration", "class_declaration", "interface_declaration", "type_alias_declaration"]),
  python: new Set(["function_definition", "class_definition"]),
};

const CLASS_TYPE: Record<SupportedLang, string> = {
  javascript: "class_declaration",
  typescript: "class_declaration",
  tsx: "class_declaration",
  python: "class_definition",
};

/** The node type holding a class's members (differs per grammar). */
const CLASS_BODY_TYPE: Record<SupportedLang, string> = {
  javascript: "class_body",
  typescript: "class_body",
  tsx: "class_body",
  python: "block",
};

/** The node type for an individual method within a class body. */
const MEMBER_TYPE: Record<SupportedLang, string> = {
  javascript: "method_definition",
  typescript: "method_definition",
  tsx: "method_definition",
  python: "function_definition",
};

/** Whether this language supports `const foo = () => {}` / `const foo = function () {}` as a chunkable declaration. */
const SUPPORTS_VARIABLE_FUNCTIONS: Record<SupportedLang, boolean> = {
  javascript: true,
  typescript: true,
  tsx: true,
  python: false,
};

export type AstChunkBoundary = {
  /** 0-indexed, inclusive */
  startLine: number;
  /** 0-indexed, inclusive */
  endLine: number;
  nodeType: string;
  /** "top-level" = direct child of the file; "member" = a method nested in a top-level class. */
  scope: "top-level" | "member";
};

export function detectAstLanguage(filePath: string): SupportedLang | null {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return null;
  return EXTENSION_LANG[filePath.slice(lastDot)] ?? null;
}

let initPromise: Promise<void> | null = null;
const languageCache = new Map<SupportedLang, Language>();
let sharedParser: Parser | null = null;

async function getParser(lang: SupportedLang): Promise<Parser> {
  if (!initPromise) {
    initPromise = Parser.init();
  }
  await initPromise;

  let language = languageCache.get(lang);
  if (!language) {
    const wasmPath = resolveWasmPath(lang);
    // turbopackIgnore: wasmPath is a runtime-computed path (see resolveWasmPath);
    // the target .wasm files are explicitly listed in next.config.ts's
    // outputFileTracingIncludes, so they ship regardless of static tracing here.
    const bytes = readFileSync(/* turbopackIgnore: true */ wasmPath);
    language = await Language.load(bytes);
    languageCache.set(lang, language);
  }

  if (!sharedParser) {
    sharedParser = new Parser();
  }
  sharedParser.setLanguage(language);
  return sharedParser;
}

/** Unwraps `export`/`export default` to the declaration node it wraps, if any. */
function unwrapExport(node: TSNode): TSNode {
  if (node.type !== "export_statement") return node;
  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i);
    if (child) return child;
  }
  return node;
}

/** Whether a `const`/`let`/`var` declaration's value is a function/arrow function (e.g. `const foo = () => {}`). */
function isVariableFunctionDeclaration(node: TSNode): boolean {
  if (node.type !== "lexical_declaration" && node.type !== "variable_declaration") {
    return false;
  }
  for (let i = 0; i < node.namedChildCount; i++) {
    const declarator = node.namedChild(i);
    if (declarator?.type !== "variable_declarator") continue;
    const value = declarator.childForFieldName("value");
    if (value && (value.type === "arrow_function" || value.type === "function_expression")) {
      return true;
    }
  }
  return false;
}

function collectMemberBoundaries(classNode: TSNode, lang: SupportedLang): AstChunkBoundary[] {
  const bodyType = CLASS_BODY_TYPE[lang];
  const memberType = MEMBER_TYPE[lang];
  const boundaries: AstChunkBoundary[] = [];

  for (let i = 0; i < classNode.namedChildCount; i++) {
    const child = classNode.namedChild(i);
    if (child?.type !== bodyType) continue;

    for (let j = 0; j < child.namedChildCount; j++) {
      const member = child.namedChild(j);
      if (member?.type === memberType) {
        boundaries.push({
          startLine: member.startPosition.row,
          endLine: member.endPosition.row,
          nodeType: member.type,
          scope: "member",
        });
      }
    }
  }

  return boundaries;
}

/**
 * Parses source text and returns function/class/interface-level boundaries
 * at the top level of the file, plus per-method boundaries within classes.
 *
 * Returns null if the language is unsupported or parsing fails for any
 * reason — callers should fall back to line-based chunking in that case.
 * This function never throws.
 */
export async function getAstBoundaries(filePath: string, sourceText: string): Promise<AstChunkBoundary[] | null> {
  const lang = detectAstLanguage(filePath);
  if (!lang) return null;

  try {
    const parser = await getParser(lang);
    const tree = parser.parse(sourceText);
    if (!tree) return null;

    const topLevelTypes = TOP_LEVEL_TYPES[lang];
    const boundaries: AstChunkBoundary[] = [];

    for (let i = 0; i < tree.rootNode.namedChildCount; i++) {
      const raw = tree.rootNode.namedChild(i);
      if (!raw) continue;
      const node = unwrapExport(raw);

      if (topLevelTypes.has(node.type)) {
        boundaries.push({
          startLine: raw.startPosition.row,
          endLine: raw.endPosition.row,
          nodeType: node.type,
          scope: "top-level",
        });

        if (node.type === CLASS_TYPE[lang]) {
          boundaries.push(...collectMemberBoundaries(node, lang));
        }
      } else if (SUPPORTS_VARIABLE_FUNCTIONS[lang] && isVariableFunctionDeclaration(node)) {
        boundaries.push({
          startLine: raw.startPosition.row,
          endLine: raw.endPosition.row,
          nodeType: "variable_function",
          scope: "top-level",
        });
      }
    }

    return boundaries;
  } catch (error) {
    console.warn(`[AST Chunk] Failed to parse ${filePath} (${lang}):`, error instanceof Error ? error.message : error);
    return null;
  }
}

export type ChunkRange = { startLine: number; endLine: number };

function windowLines(startLine: number, endLine: number, maxLines: number): ChunkRange[] {
  const ranges: ChunkRange[] = [];
  for (let start = startLine; start <= endLine; start += maxLines) {
    ranges.push({ startLine: start, endLine: Math.min(start + maxLines - 1, endLine) });
  }
  return ranges;
}

/**
 * Turns AST boundaries into the final set of line ranges to chunk:
 * - one range per top-level declaration (split into windows if it exceeds
 *   `maxLines * 3`, a safety valve for pathologically large functions/classes)
 * - one range per class method, for finer-grained search
 * - line-windowed ranges for the "gaps" between top-level declarations
 *   (imports, constants, comments) so the whole file stays searchable
 */
export function buildChunkRanges(totalLines: number, boundaries: AstChunkBoundary[], maxLines: number): ChunkRange[] {
  const topLevel = boundaries
    .filter((b) => b.scope === "top-level")
    .sort((a, b) => a.startLine - b.startLine);
  const members = boundaries.filter((b) => b.scope === "member");

  const ranges: ChunkRange[] = [];
  let cursor = 0;

  for (const boundary of topLevel) {
    if (boundary.startLine > cursor) {
      ranges.push(...windowLines(cursor, boundary.startLine - 1, maxLines));
    }
    const span = boundary.endLine - boundary.startLine + 1;
    if (span > maxLines * 3) {
      ranges.push(...windowLines(boundary.startLine, boundary.endLine, maxLines));
    } else {
      ranges.push({ startLine: boundary.startLine, endLine: boundary.endLine });
    }
    cursor = boundary.endLine + 1;
  }

  if (cursor < totalLines) {
    ranges.push(...windowLines(cursor, totalLines - 1, maxLines));
  }

  for (const member of members) {
    ranges.push({ startLine: member.startLine, endLine: member.endLine });
  }

  return ranges;
}
