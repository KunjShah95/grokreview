"use client";

import { useMemo, useState } from "react";
import { format, getDay } from "date-fns";
import type { HeatmapData } from "@/features/analytics/server/stats";

type ReviewHeatmapProps = {
  data: HeatmapData;
};

/**
 * Generate the grid positions for GitHub's contribution heatmap layout.
 * Each column = 1 week, rows = Sun (top) to Sat (bottom).
 */
function buildGrid(days: HeatmapData["days"]) {
  if (days.length === 0) return { weeks: [], monthLabels: [], dayLabels: [] };

  const firstDate = new Date(days[0].date);
  const lastDate = new Date(days[days.length - 1].date);

  // Get the start of the week containing the first day
  const start = new Date(firstDate);
  start.setDate(start.getDate() - getDay(start)); // Go back to Sunday

  // Get the end of the week containing the last day
  const end = new Date(lastDate);
  end.setDate(end.getDate() + (6 - getDay(end))); // Go forward to Saturday

  // Build weeks
  const weeks: Array<Array<{ date: string; count: number; dayIndex: number } | null>> = [];
  const dayMap = new Map(days.map((d) => [d.date, d]));

  let cursor = new Date(start);
  while (cursor <= end) {
    const week: Array<{ date: string; count: number; dayIndex: number } | null> = [];
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dateStr = cursor.toISOString().split("T")[0];
      const dayData = dayMap.get(dateStr);
      if (dayData) {
        week.push({ ...dayData, dayIndex: dayIdx });
      } else if (cursor >= firstDate && cursor <= lastDate) {
        week.push({ date: dateStr, count: 0, dayIndex: dayIdx });
      } else {
        week.push(null); // Outside range
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels
  const monthLabels: Array<{ label: string; weekIndex: number }> = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIdx) => {
    const firstNonNull = week.find((d) => d !== null);
    if (firstNonNull) {
      const month = new Date(firstNonNull.date).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: format(new Date(firstNonNull.date), "MMM"), weekIndex: weekIdx });
        lastMonth = month;
      }
    }
  });

  // Day labels (only show Mon, Wed, Fri)
  const dayLabels = [
    { index: 0, label: "" },   // Sun
    { index: 1, label: "Mon" }, // Mon
    { index: 2, label: "" },     // Tue
    { index: 3, label: "Wed" }, // Wed
    { index: 4, label: "" },     // Thu
    { index: 5, label: "Fri" }, // Fri
    { index: 6, label: "" },     // Sat
  ];

  return { weeks, monthLabels, dayLabels };
}

/**
 * Determine the color intensity (0-4) based on count relative to max.
 * GitHub uses 5 levels: none, light, medium, dark, darkest.
 */
function getIntensity(count: number, maxCount: number): number {
  if (count === 0) return 0;
  if (maxCount === 0) return 1;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const INTENSITY_COLORS = [
  // Level 0: No activity
  "bg-[#161b22] dark:bg-[#ebedf0]",
  // Level 1: Light activity
  "bg-[#0e4429] dark:bg-[#9be9a8]",
  // Level 2: Medium activity
  "bg-[#006d32] dark:bg-[#40c463]",
  // Level 3: High activity
  "bg-[#26a641] dark:bg-[#30a14e]",
  // Level 4: Highest activity
  "bg-[#39d353] dark:bg-[#216e39]",
];

function HeatmapCell({
  count,
  maxCount,
  date,
}: {
  count: number;
  maxCount: number;
  date: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const intensity = getIntensity(count, maxCount);
  const formattedDate = format(new Date(date), "MMM d, yyyy");

  return (
    <div className="relative">
      <div
        className={`size-[10px] rounded-[2px] cursor-pointer transition-colors duration-150 hover:ring-1 hover:ring-black/20 dark:hover:ring-white/30 ${
          INTENSITY_COLORS[intensity]
        }`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <div className="bg-white dark:bg-[#1c2128] border border-border rounded-[4px] px-2 py-1 whitespace-nowrap shadow-lg">
            <p className="text-[10px] text-foreground font-medium">
              {count > 0 ? `${count} review${count !== 1 ? "s" : ""}` : "No reviews"}
            </p>
            <p className="text-[9px] text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewHeatmap({ data }: ReviewHeatmapProps) {
  const { weeks, monthLabels, dayLabels } = useMemo(() => buildGrid(data.days), [data.days]);

  if (data.days.length === 0) {
    return (
      <div className="rounded-none border border-border p-6">
        <h3 className="text-sm font-medium mb-1">Review Activity</h3>
        <p className="text-xs text-muted-foreground">
          No review data available for the past year. Install the GitHub App and review some PRs to see your activity here.
        </p>
      </div>
    );
  }

  // Calculate some stats
  const activeDays = data.days.filter((d) => d.count > 0).length;

  return (
    <div className="rounded-none border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">Review Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.totalYearReviews.toLocaleString()} reviews in the past year
          </p>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div className="text-center">
            <p className="font-semibold tabular-nums">{activeDays}</p>
            <p className="text-[10px] text-muted-foreground">Active days</p>
          </div>
          <div className="text-center">
            <p className="font-semibold tabular-nums text-emerald-500">{data.currentStreak}</p>
            <p className="text-[10px] text-muted-foreground">Current streak</p>
          </div>
          <div className="text-center">
            <p className="font-semibold tabular-nums">{data.longestStreak}</p>
            <p className="text-[10px] text-muted-foreground">Longest streak</p>
          </div>
          <div className="text-center">
            <p className="font-semibold tabular-nums">{data.maxCount}</p>
            <p className="text-[10px] text-muted-foreground">Best day</p>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-[3px]">
          {/* Day labels column */}
          <div className="flex flex-col gap-[3px] pt-[18px] pr-1">
            {dayLabels.map((dl) => (
              <div
                key={dl.index}
                className="h-[10px] flex items-center justify-end"
              >
                {dl.label && (
                  <span className="text-[9px] text-muted-foreground leading-none">{dl.label}</span>
                )}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-0">
            {/* Month labels */}
            <div className="flex gap-[3px] mb-[3px] h-[14px]">
              {weeks.map((_, weekIdx) => {
                const label = monthLabels.find((m) => m.weekIndex === weekIdx);
                return (
                  <div key={weekIdx} className="w-[10px] text-[9px] text-muted-foreground leading-none">
                    {label?.label || ""}
                  </div>
                );
              })}
            </div>

            {/* Day cells */}
            {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
              <div key={dayIdx} className="flex gap-[3px]">
                {weeks.map((week, weekIdx) => {
                  const cell = week[dayIdx];
                  return (
                    <div key={weekIdx} className="size-[10px]">
                      {cell ? (
                        <HeatmapCell
                          count={cell.count}
                          maxCount={data.maxCount}
                          date={cell.date}
                        />
                      ) : (
                        <div className="size-[10px]" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          Less
        </p>
        <div className="flex items-center gap-[3px]">
          {INTENSITY_COLORS.map((color, i) => (
            <div
              key={i}
              className={`size-[10px] rounded-[2px] ${color}`}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          More
        </p>
      </div>
    </div>
  );
}
