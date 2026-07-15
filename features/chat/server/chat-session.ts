import { prisma } from "@/lib/db";
import type { RepoContextChunk } from "./retrieve";

/**
 * Finds or creates the single chat session per (user, repo) pair.
 * Uses upsert (backed by a DB unique constraint on [userId, repoFullName])
 * instead of find-then-create, since concurrent requests for the same pair
 * would otherwise race into two sessions with split chat history.
 */
export async function getOrCreateChatSession(userId: string, repoFullName: string) {
  return prisma.chatSession.upsert({
    where: { userId_repoFullName: { userId, repoFullName } },
    update: {},
    create: { userId, repoFullName },
  });
}

export async function getChatHistory(chatSessionId: string) {
  return prisma.chatMessage.findMany({
    where: { chatSessionId },
    orderBy: { createdAt: "asc" },
  });
}

export async function saveChatMessage(params: {
  chatSessionId: string;
  role: "user" | "assistant";
  content: string;
  citedChunks?: RepoContextChunk[];
}) {
  await prisma.chatMessage.create({
    data: {
      chatSessionId: params.chatSessionId,
      role: params.role,
      content: params.content,
      citedChunks: params.citedChunks ?? undefined,
    },
  });
  await prisma.chatSession.update({
    where: { id: params.chatSessionId },
    data: { updatedAt: new Date() },
  });
}
