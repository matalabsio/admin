"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
import { adminCard, adminLink } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";
import type { DailyActivityPoint } from "@/lib/admin-api";

export type ChartSegment = {
  label: string;
  value: number;
  color: string;
};

export type BarItem = {
  label: string;
  value: number;
  color: string;
  href?: string;
};

export type GroupedBarRow = {
  skill: string;
  mocks: number;
  practice: number;
};

const CYAN = "#00BCD4";
const NAVY = "#0D1F3C";
const GRID = "#F1F4F8";
const MUTED = "#94A3B8";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
};

export function AdminChartCard({
  title,
  subtitle,
  children,
  className,
  headerExtra,
}: ChartCardProps) {
  return (
    <div className={cn("flex h-full min-w-0 flex-col", adminCard, className)}>
      <div className="mb-5 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[17px] font-bold text-navy">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[12.5px] text-[#94A3B8]">{subtitle}</p>
          ) : null}
        </div>
        {headerExtra}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}

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

export type CatalogModuleStat = {
  label: string;
  live: number;
  soon: number;
};

export function MockCatalogCard({
  liveCount,
  comingSoonCount,
  modules,
}: {
  liveCount: number;
  comingSoonCount: number;
  modules: CatalogModuleStat[];
}) {
  const total = liveCount + comingSoonCount;
  const livePct = total > 0 ? Math.round((liveCount / total) * 100) : 0;

  return (
    <AdminChartCard
      title="Mock catalog"
      subtitle="Live vs coming soon"
      className="h-full"
    >
      <div className="mb-2 flex items-baseline gap-[18px]">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[26px] font-medium leading-none text-navy">
            {liveCount}
          </span>
          <span className="text-xs text-[#5A6B82]">live</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[26px] font-medium leading-none text-[#94A3B8]">
            {comingSoonCount}
          </span>
          <span className="text-xs text-[#94A3B8]">coming soon</span>
        </div>
      </div>
      <div className="mb-5 h-[9px] overflow-hidden rounded-[5px] bg-[#EDF1F6]">
        <div
          className="h-full rounded-[5px] bg-cyan transition-all"
          style={{ width: `${livePct}%` }}
        />
      </div>
      <ul className="space-y-[13px]">
        {modules.map((item) => {
          const moduleTotal = item.live + item.soon;
          const pct = moduleTotal > 0 ? Math.max((item.live / moduleTotal) * 100, 3) : 3;
          return (
            <li key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px]">
                <span className="font-semibold capitalize text-navy">{item.label}</span>
                <span className="font-mono text-[11.5px] text-[#94A3B8]">
                  {item.live} live · {item.soon} soon
                </span>
              </div>
              <div className="h-[7px] overflow-hidden rounded bg-[#EDF1F6]">
                <div
                  className="h-full rounded bg-cyan transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </AdminChartCard>
  );
}

export function HorizontalBarChart({
  items,
  detailsHref = "/admin/question-bank/overview",
  detailsLabel = "View details",
  totalLabel = "questions in the bank",
  showTotal = true,
  valueSuffix = "",
}: {
  items: BarItem[];
  detailsHref?: string;
  detailsLabel?: string;
  totalLabel?: string;
  showTotal?: boolean;
  valueSuffix?: string;
}) {
  const max = Math.max(
    valueSuffix === "%" ? 100 : 0,
    ...items.map((i) => i.value),
    1,
  );
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="flex h-full flex-col">
      <ul className="space-y-[22px]">
        {items.map((item) => {
          const widthPct = item.value > 0 ? Math.max((item.value / max) * 100, 4) : 0;
          const row = (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold capitalize text-navy">
                  {item.label}
                </span>
                <span className="font-mono text-sm font-medium text-navy tabular-nums">
                  {item.value}
                  {valueSuffix}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-md bg-[#EDF1F6]">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: item.color || CYAN,
                  }}
                />
              </div>
            </>
          );
          return (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="block cursor-pointer rounded-md transition-colors hover:bg-cyan-soft/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
                >
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
      {showTotal && total > 0 ? (
        <div className="mt-6 flex items-baseline justify-between gap-2 border-t border-[#F1F4F8] pt-[22px]">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[22px] font-medium text-navy tabular-nums">
              {total.toLocaleString()}
            </span>
            <span className="text-[12.5px] text-[#94A3B8]">{totalLabel}</span>
          </div>
          <Link
            href={detailsHref}
            className={cn(adminLink, "shrink-0 cursor-pointer text-[12.5px]")}
          >
            {detailsLabel}
          </Link>
        </div>
      ) : showTotal ? (
        <div className="mt-6 border-t border-[#F1F4F8] pt-[22px]">
          <Link
            href={detailsHref}
            className={cn(adminLink, "cursor-pointer text-[12.5px]")}
          >
            {detailsLabel}
          </Link>
        </div>
      ) : (
        <div className="mt-6 border-t border-[#F1F4F8] pt-[22px]">
          <Link
            href={detailsHref}
            className={cn(adminLink, "cursor-pointer text-[12.5px]")}
          >
            {detailsLabel}
          </Link>
        </div>
      )}
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

export function MockStatusBars({ segments }: { segments: ChartSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-[#94A3B8]">No catalog mocks yet.</p>;
  }

  return (
    <ul className="space-y-4" aria-label="Mock status distribution">
      {segments.map((segment) => {
        const pct = Math.round((segment.value / total) * 100);
        return (
          <li key={segment.label}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="text-navy">{segment.label}</span>
              <span className="tabular-nums text-navy">
                {segment.value}{" "}
                <span className="font-medium text-[#94A3B8]">({pct}%)</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#EDF1F6]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(pct, segment.value > 0 ? 6 : 0)}%`,
                  backgroundColor: segment.color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
