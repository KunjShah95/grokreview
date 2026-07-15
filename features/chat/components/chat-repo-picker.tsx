"use client";

import { useState } from "react";
import { ChatPanel } from "./chat-panel";

type SyncedRepo = {
  repoFullName: string;
  chunkCount: number;
};

type ChatRepoPickerProps = {
  repos: SyncedRepo[];
};

export function ChatRepoPicker({ repos }: ChatRepoPickerProps) {
  const [selected, setSelected] = useState(repos[0]?.repoFullName ?? null);

  if (repos.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap gap-2">
        {repos.map((repo) => (
          <button
            key={repo.repoFullName}
            onClick={() => setSelected(repo.repoFullName)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              selected === repo.repoFullName
                ? "border-primary bg-primary/10 font-medium"
                : "border-border hover:bg-muted"
            }`}
          >
            {repo.repoFullName}
            <span className="ml-1.5 text-muted-foreground">({repo.chunkCount} chunks)</span>
          </button>
        ))}
      </div>
      {selected && <ChatPanel repoFullName={selected} />}
    </div>
  );
}
