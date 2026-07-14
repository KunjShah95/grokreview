"use client";

import { format, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import type { DetailedUsageStats } from "@/features/usage/server/usage-stats";

const AXIS = "#a1a1aa";
const GRID = "#ececec";
const ACCENT = "#4f46e5";
const TOOLTIP = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 8px 24px -12px rgba(30,27,75,0.25)",
} as const;
type UsageDashboardProps = {
  stats: DetailedUsageStats;
};

export function UsageDashboard({ stats }: UsageDashboardProps) {

  // Calculate percentage color
  const pct = stats.current.percentage;
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : pct >= 50 ? "bg-blue-500" : "bg-emerald-500";

  return (
    <div className="space-y-6 p-6">
      {/* Main Usage Card */}
      <div className="rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium">Monthly Usage</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.current.limit === null
                ? "Unlimited plan — no cap on reviews"
                : `${stats.current.remaining} of ${stats.current.limit} free reviews remaining`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">
              {stats.current.used}
              {stats.current.limit !== null && (
                <span className="text-sm font-normal text-muted-foreground"> / {stats.current.limit}</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">reviews this month</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <p className="font-semibold text-lg tabular-nums">{stats.avgPerDay}</p>
            <p className="text-[10px] text-muted-foreground">Avg / day</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg tabular-nums">{stats.daysUntilReset}</p>
            <p className="text-[10px] text-muted-foreground">Days left</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg tabular-nums">{stats.totalReviews}</p>
            <p className="text-[10px] text-muted-foreground">All-time</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg tabular-nums">${stats.costEstimate.total.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Est. cost</p>
          </div>
        </div>
      </div>

      {/* Monthly History Chart */}
      <div className="rounded-xl border border-border p-6">
        <h3 className="text-sm font-medium mb-4">Monthly Review History</h3>
        {stats.monthlyHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.monthlyHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: AXIS }} />
              <YAxis tick={{ fontSize: 10, fill: AXIS }} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP}
              />
              <Bar dataKey="count" fill={ACCENT} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-xs text-muted-foreground">No review history yet</p>
          </div>
        )}
      </div>

      {/* Daily Activity + Model Usage */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Activity Mini Chart */}
        <div className="rounded-xl border border-border p-6">
          <h3 className="text-sm font-medium mb-4">Daily Activity (30 days)</h3>
          {stats.dailyActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={stats.dailyActivity}>
                <XAxis
                  dataKey="date"
                  tick={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={TOOLTIP}
                  labelFormatter={(val) => format(parseISO(val), "MMM d, yyyy")}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={ACCENT}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[150px] items-center justify-center">
              <p className="text-xs text-muted-foreground">No activity yet</p>
            </div>
          )}
        </div>

        {/* Model Usage Breakdown */}
        <div className="rounded-xl border border-border p-6">
          <h3 className="text-sm font-medium mb-4">Model Usage</h3>
          {stats.byModel.length > 0 ? (
            <div className="space-y-3">
              {stats.byModel.slice(0, 5).map((m) => (
                <div key={m.model}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground truncate max-w-[180px]">{m.model}</span>
                    <span className="font-medium tabular-nums">{m.count} ({m.percentage}%)</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${m.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[150px] items-center justify-center">
              <p className="text-xs text-muted-foreground">No model data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Cost Breakdown */}
      {stats.costEstimate.byProvider.length > 0 && (
        <div className="rounded-xl border border-border p-6">
          <h3 className="text-sm font-medium mb-4">Cost Estimate</h3>
          <div className="grid gap-3">
            {stats.costEstimate.byProvider.map((p) => (
              <div key={p.provider} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground capitalize">{p.provider}</span>
                <span className="font-medium tabular-nums">${p.cost.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex items-center justify-between text-xs font-medium">
              <span>Total</span>
              <span className="tabular-nums">${stats.costEstimate.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
