"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Library,
  RefreshCw,
  Target,
  XCircle,
} from "lucide-react";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnSecondary,
  adminCard,
  adminMeta,
  adminMutedLabel,
} from "@/components/admin/admin-ui";
import { adminApi, type ReliabilitySnapshot } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const COUNTER_CARDS: {
  key: keyof ReliabilitySnapshot["counters"];
  label: string;
  hint: string;
  accent: "teal" | "amber" | "violet" | "emerald";
  Icon: typeof Target;
}[] = [
  {
    key: "empty_hub_assignment",
    label: "Empty hub assignment",
    hint: "Plan rewrite found no hub",
    accent: "amber",
    Icon: AlertTriangle,
  },
  {
    key: "scoring_failure",
    label: "Scoring failures",
    hint: "Practice / hub score errors",
    accent: "amber",
    Icon: XCircle,
  },
  {
    key: "planner_failure",
    label: "Planner failures",
    hint: "Profile refresh / replan errors",
    accent: "amber",
    Icon: AlertTriangle,
  },
  {
    key: "hub_complete",
    label: "Hub complete",
    hint: "Completions today (UTC)",
    accent: "emerald",
    Icon: CheckCircle2,
  },
  {
    key: "task_done",
    label: "Task done",
    hint: "Study-plan tasks marked done",
    accent: "emerald",
    Icon: CheckCircle2,
  },
  {
    key: "tasks_assigned_today",
    label: "Tasks assigned today",
    hint: "Once per user/day × task count",
    accent: "teal",
    Icon: Target,
  },
];

function formatMs(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n)} ms`;
}

function shortRoute(route: string): string {
  return route.replace(/^\/api\//, "");
}

export function AdminReliabilityClient() {
  const [snap, setSnap] = useState<ReliabilitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.reliability();
      setSnap(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reliability snapshot");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counters = snap?.counters;
  const practice = snap?.practice;
  const notifications = snap?.notifications;
  const latencyEntries = Object.entries(snap?.latency ?? {}).filter(
    ([, stat]) => (stat?.n ?? 0) > 0 || stat?.p50_ms != null || stat?.p95_ms != null,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reliability"
        subtitle="Learning and practice health — counters, hot-route latency, practice catalog, and speaking outbox."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
              Refresh
            </button>
          </div>
        }
      />

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {snap?.day ? (
        <p className={adminMeta}>
          UTC day {snap.day}
          {snap.completion_rate != null
            ? ` · completion rate ${(snap.completion_rate * 100).toFixed(1)}%`
            : null}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {COUNTER_CARDS.map(({ key, label, hint, accent, Icon }) => (
          <AdminKpiCard
            key={key}
            label={label}
            value={counters?.[key] ?? "—"}
            hint={hint}
            Icon={Icon}
            accent={accent}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(adminCard, "space-y-3")}>
          <div className="flex items-center gap-2">
            <Library className="size-4 text-teal" aria-hidden />
            <p className={adminMutedLabel}>Practice ops</p>
          </div>
          {practice ? (
            <>
              <p className="font-mono text-2xl font-medium text-navy tabular-nums">
                {practice.hub_completions_7d}
                <span className={cn(adminMeta, "ml-2 font-sans text-sm font-normal")}>
                  hub completions · 7d
                </span>
              </p>
              <ul className="grid grid-cols-2 gap-2 text-sm text-ink sm:grid-cols-4">
                {Object.entries(practice.hubs_by_skill ?? {}).map(([skill, n]) => (
                  <li
                    key={skill}
                    className="rounded-xl border border-[#E4E9F0] bg-[#FBFCFD] px-3 py-2"
                  >
                    <span className="block capitalize text-[#5A6B82]">{skill}</span>
                    <span className="font-mono text-lg font-medium tabular-nums text-navy">
                      {n}
                    </span>
                    <span className={cn(adminMeta, "block")}>assignable</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={adminMeta}>{loading ? "Loading…" : "No practice data"}</p>
          )}
        </div>

        <div className={cn(adminCard, "space-y-3")}>
          <div className="flex items-center gap-2">
            <Inbox className="size-4 text-teal" aria-hidden />
            <p className={adminMutedLabel}>Speaking outbox</p>
          </div>
          {notifications ? (
            <>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="font-mono text-2xl font-medium text-navy tabular-nums">
                    {notifications.queued}
                  </p>
                  <p className={adminMeta}>queued depth</p>
                </div>
                <div>
                  <p className="font-mono text-2xl font-medium text-navy tabular-nums">
                    {notifications.failed_24h}
                  </p>
                  <p className={adminMeta}>failed · last 24h</p>
                </div>
              </div>
              {Object.keys(notifications.by_channel ?? {}).length ? (
                <ul className="space-y-1.5 text-sm text-ink">
                  {Object.entries(notifications.by_channel).map(([ch, n]) => (
                    <li key={ch} className="flex justify-between gap-3">
                      <span className="capitalize text-[#5A6B82]">{ch}</span>
                      <span className="font-mono tabular-nums text-navy">{n} queued</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={adminMeta}>No queued messages by channel.</p>
              )}
            </>
          ) : (
            <p className={adminMeta}>{loading ? "Loading…" : "No outbox data"}</p>
          )}
        </div>
      </div>

      <div className={cn(adminCard)}>
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-teal" aria-hidden />
          <p className={adminMutedLabel}>Hot-route latency (today)</p>
        </div>
        {latencyEntries.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#E4E9F0] text-[#5A6B82]">
                  <th className="pb-2 pr-4 font-medium">Route</th>
                  <th className="pb-2 pr-4 font-medium">n</th>
                  <th className="pb-2 pr-4 font-medium">p50</th>
                  <th className="pb-2 font-medium">p95</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E9F0]">
                {latencyEntries.map(([route, stat]) => (
                  <tr key={route}>
                    <td className="py-2.5 pr-4 font-mono text-[13px] text-navy">
                      {shortRoute(route)}
                    </td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-navy">
                      {stat.n}
                    </td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-navy">
                      {formatMs(stat.p50_ms)}
                    </td>
                    <td className="py-2.5 font-mono tabular-nums text-navy">
                      {formatMs(stat.p95_ms)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={cn(adminMeta, "mt-2")}>
            {loading ? "Loading…" : "No latency samples yet for hot routes."}
          </p>
        )}
      </div>

      <div className={cn(adminCard)}>
        <p className={adminMutedLabel}>Recent events</p>
        {snap?.recent_events?.length ? (
          <ul className="mt-3 divide-y divide-border">
            {snap.recent_events.map((ev, i) => (
              <li key={`${ev.ts}-${ev.kind}-${i}`} className="py-2.5 text-sm">
                <span className="font-semibold text-navy">{ev.kind ?? ev.event ?? "event"}</span>
                {ev.ts ? <span className={cn(adminMeta, "ml-2")}>{ev.ts}</span> : null}
                {ev.detail ? <p className="mt-0.5 text-slate">{ev.detail}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn(adminMeta, "mt-2")}>
            {loading ? "Loading…" : "No reliability events recorded today."}
          </p>
        )}
      </div>
    </div>
  );
}
