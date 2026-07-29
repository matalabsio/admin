"use client";

import Link from "next/link";
import { adminAvatar, adminCard, adminFilterPill, adminFilterPillActive, adminLink, adminMeta, adminStatusBadgeStyles, adminTable, adminTableHead } from "@/components/admin/admin-ui";
import type { SpeakingReviewListItem } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export type SpeakingStatusFilter = "all" | "pending" | "in_review" | "completed";

const FILTERS: { id: SpeakingStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_review", label: "In review" },
  { id: "completed", label: "Completed" },
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

function bandCell(row: SpeakingReviewListItem): string {
  if (row.human_band != null) return row.human_band.toFixed(1);
  if (row.ai_overall_band != null) return `~${row.ai_overall_band.toFixed(1)} AI`;
  return "—";
}
function StatusBadge({ status }: { status: string }) {
  const tone = status === "pending" ? "pending" : status === "in_review" ? "in_review" : "completed";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        adminStatusBadgeStyles[tone],
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

type Props = {
  items: SpeakingReviewListItem[];
  filter: SpeakingStatusFilter;
  onFilterChange: (filter: SpeakingStatusFilter) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function EvaluatorQueueList({
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
          No speaking reviews in this filter.
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((row) => (
              <article key={row.id} className={adminCard}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {row.student_name ?? row.student_email ?? "Unknown student"}
                    </p>
                    <p className={cn(adminMeta, "mt-0.5")}>
                      {formatSubmitted(row.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mt-2 text-sm text-ink/70">
                  {bandCell(row)}
                </p>
                <Link
                  href={`/admin/speaking/${row.id}`}
                  className={cn(adminLink, "mt-3 inline-block text-sm")}
                >
                  Open review →
                </Link>
              </article>
            ))}
          </div>

          <div className={cn(adminTable, "hidden md:block")}>
            <table className="w-full min-w-[720px] text-left text-sm text-ink">
              <thead className={adminTableHead}>
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Band</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span className={cn(adminAvatar, "size-8 text-xs")}>
                          {(row.student_name?.slice(0, 2) || row.student_email?.slice(0, 2) || "ST").toUpperCase()}
                        </span>
                        {row.student_name ?? row.student_email ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink/70">
                      {formatSubmitted(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-ink/80">
                      {bandCell(row)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/speaking/${row.id}`} className={adminLink}>
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

export { FILTERS as SPEAKING_STATUS_FILTERS };
