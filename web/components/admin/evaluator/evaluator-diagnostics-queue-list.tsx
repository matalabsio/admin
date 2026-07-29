"use client";

import Link from "next/link";
import {
  adminAvatar,
  adminCard,
  adminFilterPill,
  adminFilterPillActive,
  adminLink,
  adminMeta,
  adminStatusBadgeStyles,
  adminTable,
  adminTableHead,
} from "@/components/admin/admin-ui";
import type { DiagnosticQueueItem } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export type DiagnosticStatusFilter = "all" | "pending_review" | "in_review" | "reviewed";

const FILTERS: { id: DiagnosticStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending_review", label: "Pending" },
  { id: "in_review", label: "In review" },
  { id: "reviewed", label: "Reviewed" },
];

function formatSubmitted(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function bandLabel(band: number | null | undefined) {
  if (band == null) return "—";
  return band.toFixed(1);
}

function bandsCell(row: DiagnosticQueueItem): string {
  const speaking = row.speaking_human_band ?? row.speaking_band;
  return `L ${bandLabel(row.listening_band)} · R ${bandLabel(row.reading_band)} · W ${bandLabel(row.writing_band)} · S ${bandLabel(speaking)}`;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "pending_review"
      ? "pending"
      : status === "in_review"
        ? "in_review"
        : "completed";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        adminStatusBadgeStyles[tone],
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

type Props = {
  items: DiagnosticQueueItem[];
  filter: DiagnosticStatusFilter;
  onFilterChange: (filter: DiagnosticStatusFilter) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function EvaluatorDiagnosticsQueueList({
  items,
  filter,
  onFilterChange,
  page,
  totalPages,
  onPageChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Review status">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => onFilterChange(f.id)}
            className={cn(
              adminFilterPill,
              filter === f.id ? adminFilterPillActive : "hover:bg-cyan-soft/40",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className={cn(adminCard, "text-center text-sm text-ink/70")}>
          No diagnostic submissions in this filter.
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((row) => (
              <article key={row.id} className={adminCard}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{row.full_name}</p>
                    <p className={cn(adminMeta, "mt-0.5")}>
                      {row.email ?? row.phone} · {formatSubmitted(row.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mt-2 font-mono text-xs text-ink/70">{bandsCell(row)}</p>
                <p className="mt-1 text-xs text-ink/60">
                  Report:{" "}
                  {row.report_email_sent_at ? (
                    <span className="font-medium text-teal">Sent</span>
                  ) : (
                    "Not sent"
                  )}
                </p>
                <Link
                  href={`/admin/diagnostics/${row.id}`}
                  className={cn(adminLink, "mt-3 inline-block text-sm")}
                >
                  Open review →
                </Link>
              </article>
            ))}
          </div>

          <div className={cn(adminTable, "hidden md:block")}>
            <table className="w-full min-w-[880px] text-left text-sm text-ink">
              <thead className={adminTableHead}>
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Bands</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span className={cn(adminAvatar, "size-8 text-xs")}>
                          {row.full_name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p>{row.full_name}</p>
                          {row.goal_label ? (
                            <p className="text-xs text-ink/50">{row.goal_label}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      <p>{row.email ?? "—"}</p>
                      <p className="text-xs text-ink/50">{row.phone}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/80">
                      {bandsCell(row)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {row.report_email_sent_at ? (
                        <span className="font-medium text-teal">Sent</span>
                      ) : (
                        <span className="text-ink/50">Not sent</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {formatSubmitted(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/diagnostics/${row.id}`} className={adminLink}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="cursor-pointer rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className={adminMeta}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="cursor-pointer rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
