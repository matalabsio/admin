"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
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
  type ReviewAnalyticsResponse,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

function pct(rate: number | null): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(0)}%`;
}

function maeLabel(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(2);
}

export function AdminReviewAnalyticsClient() {
  const [data, setData] = useState<ReviewAnalyticsResponse | null>(null);
  const [module, setModule] = useState<"all" | "speaking" | "writing">("all");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.reviewAnalytics({ module, days });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [module, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Review analytics"
        subtitle="AI vs human agreement, override rate, and criterion MAE for completed reviews."
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

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-[#475569]">
          <span className={adminMutedLabel}>Module</span>
          <select
            className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-sm"
            value={module}
            onChange={(e) =>
              setModule(e.target.value as "all" | "speaking" | "writing")
            }
          >
            <option value="all">All</option>
            <option value="speaking">Speaking</option>
            <option value="writing">Writing</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-[#475569]">
          <span className={adminMutedLabel}>Window</span>
          <select
            className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          label="Completed"
          value={data?.completed ?? (loading ? "…" : 0)}
          hint={`Last ${days} days`}
          Icon={BarChart3}
        />
        <AdminKpiCard
          label="Agreement rate"
          value={pct(data?.agreement_rate ?? null)}
          hint="|overall Δ| ≤ 0.5"
          Icon={BarChart3}
        />
        <AdminKpiCard
          label="Override rate"
          value={pct(data?.override_rate ?? null)}
          hint="Any criterion |Δ| ≥ 0.5"
          Icon={BarChart3}
        />
        <AdminKpiCard
          label="Overall MAE"
          value={maeLabel(data?.overall_mae ?? null)}
          hint={`${data?.with_ai ?? 0} with AI · ${data?.without_ai ?? 0} without`}
          Icon={BarChart3}
        />
      </div>

      <section className={cn(adminCard, "overflow-hidden")}>
        <div className="border-b border-[#EAEEF3] px-4 py-3 sm:px-5">
          <h2 className="text-sm font-bold text-navy">Criterion MAE</h2>
          <p className={adminMeta}>Mean absolute error vs AI for completed reviews with AI scores.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[11px] uppercase tracking-wide text-[#94A3B8]">
                <th className="px-4 py-2.5 font-semibold sm:px-5">Criterion</th>
                <th className="px-4 py-2.5 font-semibold">MAE</th>
                <th className="px-4 py-2.5 font-semibold">Samples</th>
              </tr>
            </thead>
            <tbody>
              {(data?.criterion_mae ?? []).map((row, index) => (
                <tr
                  key={`${row.key}-${index}`}
                  className="border-b border-[#F8FAFC]"
                >
                  <td className="px-4 py-2.5 font-medium text-[#334155] sm:px-5">
                    {row.label}
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-navy">
                    {maeLabel(row.mae)}
                  </td>
                  <td className="px-4 py-2.5 font-mono tabular-nums text-[#64748B]">
                    {row.sample_count}
                  </td>
                </tr>
              ))}
              {!loading && (data?.criterion_mae?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[#94A3B8] sm:px-5">
                    No completed reviews with AI in this window.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
