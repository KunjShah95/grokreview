"use client";

import { useMemo } from "react";

import type { LeaderboardData } from "@/features/analytics/server/leaderboard";
import { ArrowUp, ArrowDown, Minus, Trophy } from "@phosphor-icons/react";

type LeaderboardProps = {
  data: LeaderboardData;
};

const MEDAL_COLORS = [
  "text-yellow-500",      // 1st: Gold
  "text-gray-400",        // 2nd: Silver
  "text-amber-700",       // 3rd: Bronze
];

const MEDAL_BG = [
  "bg-yellow-500/10 border-yellow-500/30",
  "bg-gray-400/10 border-gray-400/30",
  "bg-amber-700/10 border-amber-700/30",
];

function MedalIcon({ rank }: { rank: number }) {
  if (rank > 3) return null;
  return <Trophy className={`size-3.5 ${MEDAL_COLORS[rank - 1]}`} weight="fill" />;
}

function TrendBadge({ trend, percent }: { trend: string; percent: number }) {
  if (trend === "new") {
    return (
      <span className="text-[9px] text-blue-500 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded">
        NEW
      </span>
    );
  }

  if (trend === "up" && percent > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[9px] text-emerald-500 font-medium">
        <ArrowUp className="size-2.5" weight="bold" />
        {percent}%
      </span>
    );
  }

  if (trend === "down" && percent > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[9px] text-red-500 font-medium">
        <ArrowDown className="size-2.5" weight="bold" />
        {percent}%
      </span>
    );
  }

  return (
    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
      <Minus className="size-2.5" />
      Same
    </span>
  );
}

export function Leaderboard({ data }: LeaderboardProps) {
  const isEmpty = data.entries.length === 0;

  // Calculate max for progress bar width
  const maxReviews = useMemo(
    () => Math.max(...data.entries.map((e) => e.reviews), 1),
    [data.entries]
  );

  return (
    <div className="rounded-none border border-border">
      {/* Header */}
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">🏆 Monthly Leaderboard</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{data.month}</p>
          </div>
          {!isEmpty && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{data.totalContributors} contributors</span>
              <span>{data.totalReviews} total reviews</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isEmpty ? (
        <div className="p-8 text-center">
          <div className="flex justify-center mb-3">
            <Trophy className="size-8 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No leaderboard data yet</p>
          <p className="text-xs text-muted-foreground">
            Reviews are tracked by PR author. Open some PRs and get them reviewed to see rankings here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {data.entries.map((entry) => {
            const barWidth = Math.max((entry.reviews / maxReviews) * 100, 4);
            const isTop3 = entry.rank <= 3;

            return (
              <div
                key={entry.authorLogin}
className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-6 shrink-0">
                  {isTop3 ? (
                    <MedalIcon rank={entry.rank} />
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {entry.authorLogin ? (
                    <img
                      src={`https://github.com/${entry.authorLogin}.png?size=40`}
                      alt={`@${entry.authorLogin}`}
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.textContent =
                          entry.authorLogin[0]?.toUpperCase() || "?";
                      }}
                    />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">?</span>
                  )}
                </div>

                {/* Name and Repo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      @{entry.authorLogin}
                    </span>
                    <TrendBadge trend={entry.trend} percent={entry.trendPercent} />
                  </div>
                  {entry.topRepo && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {entry.topRepo}
                    </p>
                  )}
                </div>

                {/* Review Count + Progress Bar */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        entry.rank === 1
                          ? "bg-yellow-500"
                          : entry.rank === 2
                          ? "bg-gray-400"
                          : entry.rank === 3
                          ? "bg-amber-700"
                          : "bg-purple-500/50"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums w-8 text-right">
                    {entry.reviews}
                  </span>
                  {entry.avgReviewTime !== null && (
                    <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
                      {entry.avgReviewTime}m
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
