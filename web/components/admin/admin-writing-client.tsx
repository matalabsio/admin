"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EvaluatorQueueHeader,
  EvaluatorWritingQueueList,
  type WritingStatusFilter,
} from "@/components/admin/evaluator";
import { adminApi, type WritingReviewListItem } from "@/lib/admin-api";

const PAGE_SIZE = 25;

function QueueSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl border border-border bg-white"
        />
      ))}
    </div>
  );
}

export function AdminWritingClient() {
  const [items, setItems] = useState<WritingReviewListItem[]>([]);
  const [filter, setFilter] = useState<WritingStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listWriting({
        status: filter === "all" ? undefined : filter,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(res.items ?? []);
      setTotal(res.total);
      setPendingCount(res.pending_count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFilterChange = (next: WritingStatusFilter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <EvaluatorQueueHeader pendingCount={pendingCount} activeModule="writing" />

      {error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <QueueSkeleton />
      ) : (
        <EvaluatorWritingQueueList
          items={items}
          filter={filter}
          onFilterChange={onFilterChange}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
