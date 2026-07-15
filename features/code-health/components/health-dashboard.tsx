"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Badge } from "@/components/ui/badge";

const AXIS = "#a1a1aa";
const GRID = "#ececec";
const TOOLTIP = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 8px 24px -12px rgba(30,27,75,0.25)",
} as const;

export type CodeHealthHotspot = {
  filePath: string;
  complexity: number;
  lines: number;
};

export type CodeHealthSnapshotView = {
  id: string;
  repoFullName: string;
  complexityAvg: number;
  hotspotCount: number;
  hotspots: CodeHealthHotspot[];
  securityDebt: number;
  testCoverageEst: number | null;
  filesAnalyzed: number;
  computedAt: string;
};

type HealthDashboardProps = {
  latest: CodeHealthSnapshotView | null;
  history: CodeHealthSnapshotView[];
};

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "danger" | "warning" | "good" }) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "good"
      ? "text-green-600 dark:text-green-400"
      : "text-foreground";

  return (
    <div className="rounded-xl border border-border p-4 flex flex-col items-center justify-center text-center">
      <span className={`text-2xl font-bold tabular-nums tracking-tight ${toneClass}`}>{value}</span>
      <span className="text-[11px] text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

export function HealthDashboard({ latest, history }: HealthDashboardProps) {
  if (!latest) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">
          No code health data yet — sync a repository to compute its first snapshot.
        </p>
      </div>
    );
  }

  const chartData = history.map((snapshot) => ({
    date: snapshot.computedAt,
    complexity: snapshot.complexityAvg,
    securityDebt: snapshot.securityDebt,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg Complexity" value={latest.complexityAvg} tone={latest.complexityAvg > 15 ? "warning" : "good"} />
        <StatCard label="Hotspot Files" value={latest.hotspotCount} tone={latest.hotspotCount > 0 ? "warning" : "good"} />
        <StatCard label="Open Security Debt" value={latest.securityDebt} tone={latest.securityDebt > 0 ? "danger" : "good"} />
        <StatCard label="Est. Test Coverage" value={`${latest.testCoverageEst ?? 0}%`} />
      </div>

      <div className="rounded-xl border border-border p-5">
        <h3 className="text-sm font-medium mb-4">Complexity Trend</h3>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: AXIS }}
                tickFormatter={(val) => new Date(val).toLocaleDateString()}
              />
              <YAxis tick={{ fontSize: 10, fill: AXIS }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP} labelFormatter={(val) => new Date(val).toLocaleString()} />
              <Line type="monotone" dataKey="complexity" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} name="Avg complexity" />
              <Line type="monotone" dataKey="securityDebt" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} name="Security debt" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted-foreground py-8 text-center">
            Sync this repo a few more times to see a complexity trend.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border p-5">
        <h3 className="text-sm font-medium mb-4">Complexity Hotspots</h3>
        {latest.hotspots.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hotspot files detected — nice and flat complexity distribution.</p>
        ) : (
          <div className="space-y-2">
            {latest.hotspots.map((hotspot) => (
              <div key={hotspot.filePath} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                <code className="text-xs truncate max-w-[60%]">{hotspot.filePath}</code>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{hotspot.lines} lines</span>
                  <Badge variant="destructive">complexity {hotspot.complexity}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Last computed {new Date(latest.computedAt).toLocaleString()} · {latest.filesAnalyzed} files analyzed
      </p>
    </div>
  );
}
