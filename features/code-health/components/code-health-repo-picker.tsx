"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { HealthDashboard, type CodeHealthSnapshotView } from "./health-dashboard";

type SyncedRepo = {
  repoFullName: string;
};

type CodeHealthRepoPickerProps = {
  repos: SyncedRepo[];
  initialRepo: string;
  initialLatest: CodeHealthSnapshotView | null;
  initialHistory: CodeHealthSnapshotView[];
};

export function CodeHealthRepoPicker({
  repos,
  initialRepo,
  initialLatest,
  initialHistory,
}: CodeHealthRepoPickerProps) {
  const [selected, setSelected] = useState(initialRepo);
  const [latest, setLatest] = useState(initialLatest);
  const [history, setHistory] = useState(initialHistory);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected === initialRepo) return;

    let cancelled = false;
    setLoading(true);
    const [owner, repo] = selected.split("/");
    fetch(`/api/code-health/${owner}/${repo}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setLatest(data.latest);
        setHistory(data.history);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected, initialRepo]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap gap-2 px-6 pt-6">
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
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center p-12">
          <Spinner className="size-5" />
        </div>
      ) : (
        <HealthDashboard latest={latest} history={history} />
      )}
    </div>
  );
}
