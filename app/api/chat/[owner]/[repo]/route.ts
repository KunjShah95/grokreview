import { NextResponse } from "next/server";
import { getServerSession } from "@/features/auth/actions";
import { getUserInstallationId } from "@/features/github/server/installation";
import { buildRepoNamespace } from "@/features/repo-sync/server/repo-sync";
import { searchRepoContext } from "@/features/chat/server/retrieve";
import { getChatHistory, getOrCreateChatSession, saveChatMessage } from "@/features/chat/server/chat-session";
import { streamChatResponse } from "@/features/chat/server/stream-chat";
import { canPerformAiAction, recordAiAction } from "@/features/billing/server/usage";
import { prisma } from "@/lib/db";

/**
 * GET /api/chat/[owner]/[repo]
 * Returns the current chat session's message history for this repo.
 *
 * POST /api/chat/[owner]/[repo]
 * Asks a question about the repo's synced codebase (RAG). Streams the
 * answer over SSE and persists both the question and the answer.
 * Body: { message: string }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, repo } = await params;
  const repoFullName = `${owner}/${repo}`;

  const chatSession = await getOrCreateChatSession(session.user.id, repoFullName);
  const messages = await getChatHistory(chatSession.id);

  return NextResponse.json({
    chatSessionId: chatSession.id,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      citedChunks: m.citedChunks ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installationId = await getUserInstallationId(session.user.id);
  if (!installationId) {
    return NextResponse.json({ error: "No GitHub installation found" }, { status: 403 });
  }

  if (!(await canPerformAiAction(session.user.id))) {
    return NextResponse.json(
      { error: "Free plan limit reached. Upgrade to Pro for unlimited AI actions, including repo chat." },
      { status: 429 }
    );
  }

  const { owner, repo } = await params;
  const repoFullName = `${owner}/${repo}`;

  const repoSync = await prisma.repoSync.findUnique({ where: { repoFullName } });
  if (!repoSync || repoSync.installationId !== installationId || repoSync.status !== "synced") {
    return NextResponse.json(
      { error: "This repository hasn't been synced yet. Sync it from the Repositories page first." },
      { status: 400 }
    );
  }

  let message: unknown;
  try {
    const body = await request.json();
    message = body.message;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const chatSession = await getOrCreateChatSession(session.user.id, repoFullName);
  await saveChatMessage({ chatSessionId: chatSession.id, role: "user", content: message });
  await recordAiAction(session.user.id, "chat");

  const namespace = buildRepoNamespace(repoFullName);
  const contextChunks = await searchRepoContext(namespace, message);

  const stream = streamChatResponse({
    chatSessionId: chatSession.id,
    question: message,
    contextChunks,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
