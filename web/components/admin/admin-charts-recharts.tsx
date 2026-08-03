"use client";

/**
 * Recharts-backed admin charts — keep this module dynamically imported so the
 * dashboard/home chunk does not pay for recharts on first paint.
 */
import {
  CartesianGrid,
  Line,
  LineChart,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyActivityPoint } from "@/lib/admin-api";
import type { ChartSegment, GroupedBarRow } from "@/components/admin/admin-charts";

const CYAN = "#00BCD4";
const NAVY = "#0D1F3C";
const GRID = "#F1F4F8";
const MUTED = "#94A3B8";

const tooltipStyle = {
  borderRadius: "10px",
  border: "1px solid #EAEEF3",
  background: "#fff",
  color: NAVY,
  fontSize: "12px",
  boxShadow: "0 8px 22px rgba(13,31,60,0.08)",
};

export function WeeklyActivityChart({ data }: { data: DailyActivityPoint[] }) {
  const hasData = data.some((d) => d.signups > 0 || d.mock_attempts > 0);

  if (!hasData) {
    return (
      <p className="py-12 text-center text-sm text-[#94A3B8]">
        No activity recorded this week yet.
      </p>
    );
  }

  return (
    <div className="h-[220px] w-full sm:h-[260px]" role="img" aria-label="Weekly activity chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: MUTED, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "#B6C0CE", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="signups"
            name="Signups"
            stroke={CYAN}
            strokeWidth={2.5}
            dot={{ r: 3.2, fill: CYAN, strokeWidth: 0 }}
            activeDot={{ r: 4.4, stroke: "#fff", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="mock_attempts"
            name="Mock attempts"
            stroke={NAVY}
            strokeWidth={2.5}
            dot={{ r: 3.2, fill: NAVY, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UserGrowthChart({
  data,
  trendPct,
}: {
  data: DailyActivityPoint[];
  trendPct?: number | null;
}) {
  const hasData = data.some((d) => d.signups > 0);

  if (!hasData) {
    return (
      <p className="py-12 text-center text-sm text-[#94A3B8]">No signups this week yet.</p>
    );
  }

  return (
    <div className="h-[220px] w-full sm:h-[260px]" role="img" aria-label="User growth chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="adminUgFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CYAN} stopOpacity={0.22} />
              <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => {
              const d = new Date(String(v));
              return `${d.getDate()}`;
            }}
            tick={{ fontSize: 11, fill: MUTED, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "#B6C0CE", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(v) => new Date(String(v)).toLocaleDateString()}
          />
          <Area
            type="monotone"
            dataKey="signups"
            name="New signups"
            stroke={CYAN}
            strokeWidth={2.5}
            fill="url(#adminUgFill)"
            dot={{ r: 3.2, fill: CYAN, strokeWidth: 0 }}
            activeDot={{ r: 4.4, stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {trendPct != null ? (
        <span className="sr-only">Trend {trendPct}%</span>
      ) : null}
    </div>
  );
}


export function ModuleDonutChart({
  segments,
  centerLabel = "total",
}: {
  segments: ChartSegment[];
  centerLabel?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const data = segments
    .filter((s) => s.value > 0)
    .map((s) => ({ name: s.label, value: s.value, color: s.color }));

  if (total === 0 || data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[#94A3B8]">
        No questions to chart yet.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 sm:flex-row sm:items-center">
      <div
        className="relative mx-auto h-[200px] w-full max-w-[220px] shrink-0 sm:mx-0"
        role="img"
        aria-label={`Question distribution donut: ${total} ${centerLabel}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [
                typeof value === "number" ? value.toLocaleString() : String(value ?? ""),
                "Questions",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[22px] font-semibold tabular-nums text-navy">
            {total.toLocaleString()}
          </span>
          <span className="font-mono text-[11px] text-[#94A3B8]">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5" aria-label="Module share legend">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <li
              key={seg.label}
              className="flex items-center justify-between gap-3 rounded-lg px-1 py-1"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden
                />
                <span className="truncate text-sm font-semibold capitalize text-navy">
                  {seg.label}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-[#5A6B82]">
                {seg.value.toLocaleString()}{" "}
                <span className="text-[#94A3B8]">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MockVsPracticeBarChart({ rows }: { rows: GroupedBarRow[] }) {
  const hasData = rows.some((r) => r.mocks > 0 || r.practice > 0);
  if (!hasData) {
    return (
      <p className="py-12 text-center text-sm text-[#94A3B8]">
        No mock or practice questions yet.
      </p>
    );
  }

  return (
    <div
      className="h-[240px] w-full sm:h-[280px]"
      role="img"
      aria-label="Mock versus practice questions by skill"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          barGap={4}
          barCategoryGap="28%"
        >
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="skill"
            tick={{ fontSize: 11, fill: MUTED, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) =>
              v.charAt(0).toUpperCase() + v.slice(1, 3)
            }
          />
          <YAxis
            tick={{ fontSize: 11, fill: MUTED, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-[11.5px] font-medium text-[#5A6B82]">{value}</span>
            )}
          />
          <Bar dataKey="mocks" name="Live mocks" fill={CYAN} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="practice" name="Practice bank" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

