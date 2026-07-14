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
  reviewed: "#22c55e",
  pending: "#f59e0b",
  processing: "#3b82f6",
  rate_limited: "#ef4444",
};

const CHART_COLORS = ["#8b5cf6", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

type ReviewChartsProps = {
  analytics: ReviewAnalytics;
};

export function ReviewCharts({ analytics }: ReviewChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Reviews Over Time (Line Chart) */}
      <div className="rounded-none border border-border p-5">
        <h3 className="text-sm font-medium mb-4">Reviews (Last 30 Days)</h3>
        {analytics.reviewsByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.reviewsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 0,
                  fontSize: 12,
                }}
                labelFormatter={(val) => new Date(val).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#8b5cf6" }}
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
      <div className="rounded-none border border-border p-5">
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
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 0,
                  fontSize: 12,
                }}
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
        <div className="rounded-none border border-border p-5 md:col-span-2">
          <h3 className="text-sm font-medium mb-4">Top Repositories</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.topRepositories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="repoFullName"
                tick={{ fontSize: 10 }}
                width={200}
                tickFormatter={(val) => val.split("/")[1] || val}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 0,
                  fontSize: 12,
                }}
                labelFormatter={(val) => val}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Model Usage (Bar Chart) */}
      {analytics.modelUsage.length > 0 && (
        <div className="rounded-none border border-border p-5 md:col-span-2">
          <h3 className="text-sm font-medium mb-4">Model Usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.modelUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="model" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 0,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="#22c55e" radius={[2, 2, 0, 0]} />
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
    <div className="rounded-none border border-border p-5">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums tracking-tight ${color || ""}`}>
        {value}
      </p>
      {description && (
        <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
