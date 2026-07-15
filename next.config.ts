import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '.ngrok-free.dev'],
  // web-tree-sitter and the tree-sitter-* grammar packages ship prebuilt
  // .wasm files that must be read from disk at runtime (features/reviews/utils/ast-chunk.ts).
  // Marking them external keeps webpack from trying to bundle them, and
  // outputFileTracingIncludes guarantees the .wasm assets ship with a
  // serverless deployment (e.g. Vercel) even if its file tracer can't see
  // the dynamic require.resolve() call that loads them.
  serverExternalPackages: [
    "web-tree-sitter",
    "tree-sitter-javascript",
    "tree-sitter-typescript",
    "tree-sitter-python",
  ],
  outputFileTracingIncludes: {
    "/api/inngest": [
      "./node_modules/web-tree-sitter/*.wasm",
      "./node_modules/tree-sitter-javascript/*.wasm",
      "./node_modules/tree-sitter-typescript/*.wasm",
      "./node_modules/tree-sitter-python/*.wasm",
    ],
  },
};

export default nextConfig;
