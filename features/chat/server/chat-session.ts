import { prisma } from "@/lib/db";
import type { RepoContextChunk } from "./retrieve";

/** Finds or creates the single chat session per (user, repo) pair. */
export async function getOrCreateChatSession(userId: string, repoFullName: string) {
  const existing = await prisma.chatSession.findFirst({
    where: { userId, repoFullName },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return existing;
  }

  return prisma.chatSession.create({
    data: { userId, repoFullName },
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
