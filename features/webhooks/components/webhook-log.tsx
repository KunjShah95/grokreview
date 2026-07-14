"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { WarningCircle, CheckCircle, XCircle } from "@phosphor-icons/react";
import type { WebhookEvent } from "@/features/webhooks/types";

const STATUS_STYLES: Record<string, { label: string; variant: "secondary" | "default" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  received: { label: "Received", variant: "secondary", icon: CheckCircle },
  processed: { label: "Processed", variant: "default", icon: CheckCircle },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
};

type WebhookLogProps = {
  initialLimit?: number;
  autoRefresh?: boolean;
};

export function WebhookLog({ initialLimit = 50, autoRefresh = false }: WebhookLogProps) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    received: 0,
    processed: 0,
    failed: 0,
    eventTypes: [] as string[],
  });

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/webhooks/log?limit=${initialLimit}&filter=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEvents(data.events);
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch webhook log:", error);
    } finally {
      setLoading(false);
    }
  }, [initialLimit, filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh every 5 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("all")}
          >
            All ({stats.total})
          </Button>
          <Button
            variant={filter === "pull_request" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("pull_request")}
          >
            PR ({stats.received})
          </Button>
          <Button
            variant={filter === "processed" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("processed")}
          >
            Processed ({stats.processed})
          </Button>
          <Button
            variant={filter === "failed" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("failed")}
          >
            Failed ({stats.failed})
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={fetchLogs}
          disabled={loading}
        >
          {loading ? <Spinner className="size-3" /> : "Refresh"}
        </Button>
      </div>

      {/* Event Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-5" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-12">
          <p className="text-xs text-muted-foreground">
            No webhook events received yet. Install the GitHub App and open a PR.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1"></TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const style = STATUS_STYLES[event.status] || STATUS_STYLES.received;
                const Icon = style.icon;

                return (
                  <>
                    <TableRow
                      key={event.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                    >
                      <TableCell>
                        <Icon className={`size-3 ${
                          event.status === "failed" ? "text-red-500" :
                          event.status === "processed" ? "text-green-500" :
                          "text-muted-foreground"
                        }`} />
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{event.eventName}</code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {event.action || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {event.repoFullName || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={style.variant} className="text-[10px] font-normal">
                          {style.label} ({event.statusCode})
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {event.durationMs}ms
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                    {expandedId === event.id && (
                      <TableRow key={`${event.id}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/20 p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">
                                Payload
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(event.createdAt), "MMM d, yyyy HH:mm:ss.SSS")}
                              </span>
                            </div>
                            {event.error && (
                              <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                                {event.error}
                              </div>
                            )}
                            <pre className="text-[10px] bg-muted p-3 overflow-x-auto max-h-60">
                              {event.payload.length > 2000
                                ? event.payload.slice(0, 2000) + "\n\n...(truncated)"
                                : event.payload}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
