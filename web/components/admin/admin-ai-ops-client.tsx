"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Coins,
  Cpu,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnSecondary,
  adminCard,
  adminMeta,
  adminMutedLabel,
} from "@/components/admin/admin-ui";
import {
  adminApi,
  type AiHealthResponse,
  type AiMetricsResponse,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

function formatUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

export function AdminAiOpsClient() {
  const [metrics, setMetrics] = useState<AiMetricsResponse | null>(null);
  const [health, setHealth] = useState<AiHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, h] = await Promise.all([adminApi.aiMetrics(), adminApi.aiHealth()]);
      setMetrics(m);
      setHealth(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="AI ops"
        subtitle="Budget, latency, success rate, and provider health for writing evaluation."
        actions={
          <button
            type="button"
            className={adminBtnSecondary}
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          label="Claude-eligible calls today"
          value={metrics?.calls ?? "—"}
          hint="All writing eval attempts recorded"
          Icon={Activity}
          accent="teal"
        />
        <AdminKpiCard
          label="Est. cost today"
          value={metrics ? formatUsd(metrics.estimated_cost_usd) : "—"}
          hint="Token estimate × configured $/MTok"
          Icon={Coins}
          accent="amber"
        />
        <AdminKpiCard
          label="Avg latency"
          value={metrics ? `${Math.round(metrics.avg_latency_ms)} ms` : "—"}
          hint="Successful evaluations"
          Icon={Clock}
          accent="violet"
        />
        <AdminKpiCard
          label="Success rate"
          value={metrics ? `${metrics.success_rate_pct}%` : "—"}
          hint={`Retry rate ${metrics?.retry_rate_pct ?? 0}%`}
          Icon={Shield}
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(adminCard, "space-y-3")}>
          <p className={adminMutedLabel}>Budget (Claude evals)</p>
          {metrics ? (
            <>
              <p className="font-mono text-2xl font-medium text-navy tabular-nums">
                {metrics.budget.daily_used}/{metrics.budget.daily_limit} today
              </p>
              <p className={adminMeta}>
                Monthly {metrics.budget.monthly_used}/{metrics.budget.monthly_limit}
                {metrics.budget.ok ? " · OK" : " · BLOCKED"}
                {metrics.budget.warning && metrics.budget.ok ? " · warning" : ""}
              </p>
              {metrics.budget.reason ? (
                <p className="text-sm text-amber-800">{metrics.budget.reason}</p>
              ) : null}
            </>
          ) : (
            <p className={adminMeta}>Loading…</p>
          )}
        </div>

        <div className={cn(adminCard, "space-y-3")}>
          <p className={adminMutedLabel}>Provider health</p>
          {health ? (
            <ul className="space-y-1.5 text-sm text-ink">
              <li>Redis: {health.redis_status}</li>
              <li>Claude configured: {health.claude_configured ? "yes" : "no"}</li>
              <li>Groq configured: {health.groq_configured ? "yes" : "no"}</li>
              <li>Writing stub: {health.writing_eval_stub ? "on" : "off"}</li>
              <li>
                Circuit:{" "}
                {health.circuit_open ? (
                  <span className="font-semibold text-rose-700">OPEN</span>
                ) : (
                  <span className="font-semibold text-teal">closed</span>
                )}
              </li>
              <li>
                Speaking pending / failed: {health.speaking_pending} / {health.speaking_failed}
              </li>
            </ul>
          ) : (
            <p className={adminMeta}>Loading…</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          label="Stub calls"
          value={metrics?.stub_calls ?? "—"}
          Icon={Sparkles}
          accent="violet"
        />
        <AdminKpiCard
          label="Cache hits"
          value={metrics?.cache_hits ?? "—"}
          hint={`Misses ${metrics?.cache_misses ?? 0}`}
          Icon={Cpu}
          accent="teal"
        />
        <AdminKpiCard
          label="Retries"
          value={metrics?.retries ?? "—"}
          Icon={RefreshCw}
          accent="amber"
        />
        <AdminKpiCard
          label="Errors"
          value={metrics?.errors ?? "—"}
          Icon={AlertTriangle}
          accent="amber"
        />
      </div>

      <div className={cn(adminCard)}>
        <p className={adminMutedLabel}>Recent failures</p>
        {metrics?.recent_failures?.length ? (
          <ul className="mt-3 divide-y divide-border">
            {metrics.recent_failures.map((f, i) => (
              <li key={`${f.at}-${i}`} className="py-2.5 text-sm">
                <span className="font-semibold text-navy">{f.provider}</span>
                <span className={cn(adminMeta, "ml-2")}>{f.at}</span>
                <p className="mt-0.5 text-slate">{f.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={cn(adminMeta, "mt-2")}>No recent failures recorded.</p>
        )}
      </div>
    </div>
  );
}
