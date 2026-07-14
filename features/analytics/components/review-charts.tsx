"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import type { ReviewAnalytics } from "@/features/analytics/server/stats";

const STATUS_COLORS: Record<string, string> = {
  reviewed: "#16a34a",
  pending: "#d97706",
  processing: "#4f46e5",
  rate_limited: "#dc2626",
};

// Indigo-anchored sequence (matches --chart-* tokens), no AI-purple
const CHART_COLORS = ["#4f46e5", "#6366f1", "#0ea5e9", "#10b981", "#f59e0b"];

// Light chart chrome (page is light-locked)
const AXIS = "#a1a1aa";
const GRID = "#ececec";
const TOOLTIP = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 8px 24px -12px rgba(30,27,75,0.25)",
} as const;
const ACCENT = "#4f46e5";

type ReviewChartsProps = {
  analytics: ReviewAnalytics;
};

export function ReviewCharts({ analytics }: ReviewChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Reviews Over Time (Line Chart) */}
      <div className="rounded-xl border border-border p-5">
        <h3 className="text-sm font-medium mb-4">Reviews (Last 30 Days)</h3>
        {analytics.reviewsByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.reviewsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: AXIS }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 10, fill: AXIS }} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP}
                labelFormatter={(val) => new Date(val).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={ACCENT}
                strokeWidth={2}
                dot={{ r: 3, fill: ACCENT }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-xs text-muted-foreground">No review data yet</p>
          </div>
        )}
      </div>

      {/* Reviews by Status (Pie Chart) */}
      <div className="rounded-xl border border-border p-5">
        <h3 className="text-sm font-medium mb-4">Reviews by Status</h3>
        {analytics.reviewsByStatus.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.reviewsByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {analytics.reviewsByStatus.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] || "#6b7280"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[250px] items-center justify-center">
            <p className="text-xs text-muted-foreground">No data yet</p>
          </div>
        )}
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {analytics.reviewsByStatus.map((entry) => (
            <div key={entry.status} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[entry.status] || "#6b7280" }}
              />
              <span className="text-[10px] text-muted-foreground capitalize">
                {entry.status} ({entry.count})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Repositories (Bar Chart) */}
      {analytics.topRepositories.length > 0 && (
        <div className="rounded-xl border border-border p-5 md:col-span-2">
          <h3 className="text-sm font-medium mb-4">Top Repositories</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.topRepositories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis type="number" tick={{ fontSize: 10, fill: AXIS }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="repoFullName"
                tick={{ fontSize: 10, fill: AXIS }}
                width={200}
                tickFormatter={(val) => val.split("/")[1] || val}
              />
              <Tooltip
                contentStyle={TOOLTIP}
                labelFormatter={(val) => val}
              />
              <Bar dataKey="count" fill={ACCENT} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Model Usage (Bar Chart) */}
      {analytics.modelUsage.length > 0 && (
        <div className="rounded-xl border border-border p-5 md:col-span-2">
          <h3 className="text-sm font-medium mb-4">Model Usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.modelUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="model" tick={{ fontSize: 10, fill: AXIS }} />
              <YAxis tick={{ fontSize: 10, fill: AXIS }} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP}
              />
              <Bar dataKey="count" fill={ACCENT} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: string | number;
  description?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border p-5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums tracking-tight ${color || ""}`}>
        {value}
      </p>
      {description && (
        <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
