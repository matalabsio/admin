"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminBtnSecondary,
  adminCard,
  adminFilterPill,
  adminFilterPillActive,
  adminMeta,
  adminMutedLabel,
  adminStatusBadgeStyles,
  adminTable,
  adminTableHead,
  type AdminStatusTone,
} from "@/components/admin/admin-ui";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminApi,
  type AdminPaymentItem,
  type AdminPaymentMetrics,
  type AdminSubscriptionItem,
} from "@/lib/admin-api";
import { formatInr } from "@/lib/payments";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const STATUS_TONE: Record<string, AdminStatusTone> = {
  paid: "completed",
  active: "completed",
  failed: "pending",
  refunded: "archived",
  created: "draft",
  expired: "archived",
  cancelled: "inactive",
};

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status.toLowerCase()] ?? "archived";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        adminStatusBadgeStyles[tone],
      )}
    >
      {status}
    </span>
  );
}

type Tab = "payments" | "subscriptions";

export function AdminPaymentsClient({ initialTab = "payments" }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [metrics, setMetrics] = useState<AdminPaymentMetrics | null>(null);
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    adminApi
      .paymentMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  const load = useCallback(
    async (currentTab: Tab, pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        if (currentTab === "payments") {
          const res = await adminApi.listPayments({
            page: pageNum,
            page_size: PAGE_SIZE,
          });
          setPayments(res.items);
          setTotal(res.total);
        } else {
          const res = await adminApi.listSubscriptions({
            page: pageNum,
            page_size: PAGE_SIZE,
          });
          setSubscriptions(res.items);
          setTotal(res.total);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(tab, page);
  }, [load, tab, page]);

  function switchTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Payments"
        title="Payments & subscriptions"
        subtitle="Revenue, transactions, and active plans"
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={adminCard}>
          <p className={adminMutedLabel}>Total revenue</p>
          <p className="mt-1 font-mono text-2xl font-medium text-navy">
            {metrics ? formatInr(metrics.revenue_total) : "—"}
          </p>
        </div>
        <div className={adminCard}>
          <p className={adminMutedLabel}>Revenue 30d</p>
          <p className="mt-1 font-mono text-2xl font-medium text-navy">
            {metrics ? formatInr(metrics.revenue_30d) : "—"}
          </p>
        </div>
        <div className={adminCard}>
          <p className={adminMutedLabel}>Paid payments</p>
          <p className="mt-1 font-mono text-2xl font-medium text-navy">
            {metrics?.paid_count ?? "—"}
          </p>
        </div>
        <div className={adminCard}>
          <p className={adminMutedLabel}>Active subscriptions</p>
          <p className="mt-1 font-mono text-2xl font-medium text-navy">
            {metrics?.active_subscriptions ?? "—"}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchTab("payments")}
          className={cn(adminFilterPill, tab === "payments" && adminFilterPillActive)}
        >
          Payments
        </button>
        <button
          type="button"
          onClick={() => switchTab("subscriptions")}
          className={cn(adminFilterPill, tab === "subscriptions" && adminFilterPillActive)}
        >
          Subscriptions
        </button>
      </div>

      {error ? (
        <p className="text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : tab === "payments" ? (
        payments.length === 0 ? (
          <p className="text-gray-600">No payments yet.</p>
        ) : (
          <div className={adminTable}>
            <table className="w-full min-w-[840px] text-left text-sm text-black">
              <thead className={adminTableHead}>
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy">{p.student_name ?? "—"}</p>
                      <p className="text-xs text-[#5A6B82]">{p.student_email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.plan_name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-navy">
                      {formatInr(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">
                      {p.razorpay_order_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : subscriptions.length === 0 ? (
        <p className="text-gray-600">No subscriptions yet.</p>
      ) : (
        <div className={adminTable}>
          <table className="w-full min-w-[760px] text-left text-sm text-black">
            <thead className={adminTableHead}>
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Starts</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy">{s.student_name ?? "—"}</p>
                    <p className="text-xs text-[#5A6B82]">{s.student_email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{s.plan_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-700">
                    {formatDate(s.starts_at)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-700">
                    {formatDate(s.expires_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3">
          <p className={adminMeta}>
            Page {page} of {totalPages} · {total} records
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={adminBtnSecondary}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={adminBtnSecondary}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
