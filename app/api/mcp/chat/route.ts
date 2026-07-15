import { NextResponse } from "next/server";
import { buildRepoNamespace } from "@/features/repo-sync/server/repo-sync";
import { searchRepoContext } from "@/features/chat/server/retrieve";
import { generateChatAnswer } from "@/features/chat/server/generate-answer";
import { prisma } from "@/lib/db";

/**
 * POST /api/mcp/chat
 *
 * API-key-authenticated bridge so headless clients (the grokreview-mcp
 * server, scripts, CI) can ask a synced repo a question without a browser
 * session. Stateless — no chat history is persisted, unlike the dashboard's
 * session-based /api/chat/[owner]/[repo] endpoint.
 *
 * Headers: Authorization: Bearer <MCP_BRIDGE_API_KEY>
 * Body:    { repoFullName: string, message: string }
 *
 * SECURITY: MCP_BRIDGE_API_KEY MUST be set on the deployment.
 *           Without it, the endpoint refuses all requests.
 */
export async function POST(request: Request) {
  const apiKey = process.env.MCP_BRIDGE_API_KEY;
  if (!apiKey) {
    console.error(
      "MCP_BRIDGE_API_KEY is not set. Set it in your deployment environment to enable the MCP chat bridge."
    );
    return NextResponse.json(
      {
        error:
          "Server misconfigured: MCP_BRIDGE_API_KEY is not set. " +
          "Set this environment variable on your deployment.",
      },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const requestKey = authHeader?.replace("Bearer ", "");
  if (!requestKey || requestKey !== apiKey) {
    return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });
  }

  let repoFullName: unknown;
  let message: unknown;
  try {
    const body = await request.json();
    repoFullName = body.repoFullName;
    message = body.message;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!repoFullName || typeof repoFullName !== "string") {
    return NextResponse.json({ error: "repoFullName is required" }, { status: 400 });
  }
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const repoSync = await prisma.repoSync.findUnique({ where: { repoFullName } });
  if (!repoSync || repoSync.status !== "synced") {
    return NextResponse.json(
      { error: `${repoFullName} hasn't been synced yet. Sync it from the GrokReview dashboard first.` },
      { status: 400 }
    );
  }

  try {
    const namespace = buildRepoNamespace(repoFullName);
    const contextChunks = await searchRepoContext(namespace, message);
    const answer = await generateChatAnswer({ question: message, contextChunks });

    return NextResponse.json(answer);
  } catch (error) {
    console.error("[MCP Chat Bridge]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
