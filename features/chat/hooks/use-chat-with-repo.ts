"use client";

import { useCallback, useRef, useState } from "react";
import type { RepoContextChunk } from "@/features/chat/server/retrieve";

export type ChatMessageView = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: RepoContextChunk[];
};

export function useChatWithRepo(repoFullName: string) {
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    const [owner, repo] = repoFullName.split("/");
    const response = await fetch(`/api/chat/${owner}/${repo}`);
    if (!response.ok) return;
    const data = await response.json();
    setMessages(
      data.messages.map(
        (m: { id: string; role: "user" | "assistant"; content: string; citedChunks?: RepoContextChunk[] | null }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citedChunks ?? undefined,
        })
      )
    );
  }, [repoFullName]);

  const sendMessage = useCallback(
    async (question: string) => {
      const [owner, repo] = repoFullName.split("/");
      setError(null);
      setStatus("loading");

      const userMessage: ChatMessageView = { id: `local-${Date.now()}`, role: "user", content: question };
      const assistantId = `local-${Date.now()}-assistant`;
      setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }]);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const response = await fetch(`/api/chat/${owner}/${repo}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Server error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        setStatus("streaming");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "token") {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.data } : m))
                );
              } else if (event.type === "citations") {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, citations: event.data } : m))
                );
              } else if (event.type === "error") {
                setStatus("error");
                setError(event.data);
              } else if (event.type === "done") {
                setStatus("idle");
              }
            } catch {
              // Skip malformed line
            }
          }
        }
        setStatus("idle");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("idle");
          return;
        }
        setStatus("error");
        setError(err instanceof Error ? err.message : "Chat failed");
      }
    },
    [repoFullName]
  );

  return { messages, status, error, sendMessage, loadHistory };
}
