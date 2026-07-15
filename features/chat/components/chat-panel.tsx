"use client";

import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight, FileText } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useChatWithRepo } from "@/features/chat/hooks/use-chat-with-repo";

type ChatPanelProps = {
  repoFullName: string;
};

export function ChatPanel({ repoFullName }: ChatPanelProps) {
  const { messages, status, error, sendMessage, loadHistory } = useChatWithRepo(repoFullName);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [repoFullName, loadHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || status === "loading" || status === "streaming") return;
    setInput("");
    sendMessage(question);
  };

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-border overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[60vh]">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center pt-12">
            Ask anything about <code className="text-xs">{repoFullName}</code> — e.g. &quot;where do we
            handle auth sessions?&quot;
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 border border-border"
              }`}
            >
              {message.content || <Spinner className="size-3" />}
              {message.role === "assistant" && message.citations && message.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1 border-t border-border/50 pt-2">
                  {message.citations.map((citation) => (
                    <Badge key={citation.filePath} variant="outline" className="gap-1">
                      <FileText className="size-2.5" />
                      {citation.filePath}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {error && <p className="text-xs text-destructive text-center">{error}</p>}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this repository..."
          disabled={status === "loading" || status === "streaming"}
        />
        <Button type="submit" size="icon" disabled={status === "loading" || status === "streaming" || !input.trim()}>
          <PaperPlaneRight className="size-4" />
        </Button>
      </form>
    </div>
  );
}
