"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  CaretDown,
  CaretUp,
  Eye,
  EyeSlash,
  Funnel,
} from "@phosphor-icons/react";
import type { PRReviewHistoryItem } from "@/features/reviews/server/get-pr-history";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AvailableModel = {
  model: string;
  count: number;
};

type PRHistoryListProps = {
  items: PRReviewHistoryItem[];
  models: AvailableModel[];
};

const STATUS_STYLES: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  processing: { label: "Processing", variant: "secondary" },
  reviewed: { label: "Reviewed", variant: "default" },
  rate_limited: { label: "Rate Limited", variant: "destructive" },
};

const TRUNCATE_LENGTH = 300;

function ReviewComment({ comment }: { comment: string | null; repoFullName: string; prNumber: number }) {
  const [expanded, setExpanded] = useState(false);

  if (!comment) {
    return (
      <span className="text-xs text-muted-foreground italic">No review generated yet.</span>
    );
  }

  const isLong = comment.length > TRUNCATE_LENGTH;
  const displayText = expanded || !isLong ? comment : comment.slice(0, TRUNCATE_LENGTH) + "…";

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-sans">
          {displayText}
        </pre>
      </div>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <EyeSlash className="size-3" /> Show less
            </>
          ) : (
            <>
              <Eye className="size-3" /> Show full review
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || { label: status, variant: "outline" as const };
  return (
    <Badge variant={style.variant} className="font-normal text-[10px] px-2 py-0.5">
      {style.label}
    </Badge>
  );
}

export function PRHistoryList({ items, models }: PRHistoryListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filter based on search, status, and model
  const filtered = items.filter((pr) => {
    const matchesSearch =
      !search ||
      pr.title.toLowerCase().includes(search.toLowerCase()) ||
      pr.repoFullName.toLowerCase().includes(search.toLowerCase()) ||
      (pr.authorLogin?.toLowerCase().includes(search.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === "all" || pr.status === statusFilter;

    const matchesModel = modelFilter === "all" || pr.model === modelFilter;

    return matchesSearch && matchesStatus && matchesModel;
  });

  // Count by status
  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    processing: items.filter((i) => i.status === "processing").length,
    reviewed: items.filter((i) => i.status === "reviewed").length,
    rate_limited: items.filter((i) => i.status === "rate_limited").length,
  };

  // Count by model
  const activeModel = modelFilter === "all" ? null : modelFilter;
  const modelLabel = activeModel
    ? (activeModel.length > 30 ? activeModel.slice(0, 30) + "…" : activeModel)
    : "All Models";

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const filters = [
    { key: "all", label: "All", count: counts.all },
    { key: "reviewed", label: "Reviewed", count: counts.reviewed },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "processing", label: "Processing", count: counts.processing },
    { key: "rate_limited", label: "Rate Limited", count: counts.rate_limited },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {/* Filter & Search bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 flex-wrap">
          {filters.map((f) => (
            <Button
              key={f.key}
              variant={statusFilter === f.key ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-70">({f.count})</span>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Model Filter Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              onBlur={() => setTimeout(() => setModelDropdownOpen(false), 150)}
            >
              <Funnel className="size-3" />
              {modelLabel}
            </Button>
            {modelDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border border-border bg-background shadow-lg">
                <button
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${modelFilter === "all" ? "bg-muted font-medium" : ""}`}
                  onClick={() => { setModelFilter("all"); setModelDropdownOpen(false); }}
                >
                  All Models
                </button>
                {models.map((m) => (
                  <button
                    key={m.model}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center justify-between ${modelFilter === m.model ? "bg-muted font-medium" : ""}`}
                    onClick={() => { setModelFilter(m.model); setModelDropdownOpen(false); }}
                  >
                    <code className="text-[11px] truncate max-w-[140px]">{m.model}</code>
                    <span className="text-[10px] text-muted-foreground ml-2 tabular-nums">{m.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            placeholder="Search PRs by title, repo, or author..."
            className="max-w-48 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-12">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "No pull requests reviewed yet. Connect your GitHub App and open a PR."
                : "No pull requests match your filters."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Pull Request</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pr) => (
                <>
                  <TableRow
                    key={pr.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(pr.id)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-6">
                        {expandedRow === pr.id ? (
                          <CaretUp className="size-3" />
                        ) : (
                          <CaretDown className="size-3" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{pr.title}</span>
                        <span className="text-xs text-muted-foreground">
                          #{pr.prNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">
                        {pr.repoFullName}
                      </code>
                    </TableCell>
                    <TableCell>
                      {pr.authorLogin ? (
                        <span className="text-sm">@{pr.authorLogin}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={pr.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                  {expandedRow === pr.id && (
                    <TableRow key={`${pr.id}-expanded`}>
                      <TableCell colSpan={6} className="bg-muted/20 p-4">
                        <div className="space-y-3">
                          {/* PR Metadata */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Branch:</span>{" "}
                              <code className="text-xs">{pr.baseBranch}</code>
                            </div>
                            <div>
                              <span className="text-muted-foreground">SHA:</span>{" "}
                              <code className="text-xs">{pr.headSha.slice(0, 7)}</code>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created:</span>{" "}
                              {format(new Date(pr.createdAt), "MMM d, yyyy HH:mm")}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reviewed:</span>{" "}
                              {pr.reviewedAt
                                ? format(new Date(pr.reviewedAt), "MMM d, yyyy HH:mm")
                                : "—"}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Model:</span>{" "}
                              {pr.model ? (
                                <code className="text-xs">{pr.model}</code>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="border-t border-border" />

                          {/* Review Content */}
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                              AI Review
                            </h4>
                            <ReviewComment
                              comment={pr.reviewComment}
                              repoFullName={pr.repoFullName}
                              prNumber={pr.prNumber}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary footer */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {items.length} pull requests
        </p>
      )}
    </div>
  );
}
