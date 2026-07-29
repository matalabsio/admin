"use client";

import type { ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminCard } from "@/components/admin/admin-ui";
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

export function HorizontalBarChart({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((s, i) => s + i.value, 0);

  return (
    <div className="flex h-full flex-col">
      <ul className="space-y-[22px]">
        {items.map((item) => {
          const widthPct = item.value > 0 ? Math.max((item.value / max) * 100, 4) : 0;
          return (
            <li key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold capitalize text-navy">{item.label}</span>
                <span className="font-mono text-sm font-medium text-navy tabular-nums">
                  {item.value}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-md bg-[#EDF1F6]">
                <div
                  className="h-full rounded-md bg-cyan transition-all duration-500"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {total > 0 ? (
        <div className="mt-6 flex items-baseline gap-2 border-t border-[#F1F4F8] pt-[22px]">
          <span className="font-mono text-[22px] font-medium text-navy tabular-nums">
            {total.toLocaleString()}
          </span>
          <span className="text-[12.5px] text-[#94A3B8]">questions in the bank</span>
        </div>
      ) : null}
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
