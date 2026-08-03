"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { adminCard, adminLink } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

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
