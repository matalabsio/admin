"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  EvaluatorDiagnosticsQueueList,
  EvaluatorQueueHeader,
  type DiagnosticStatusFilter,
} from "@/components/admin/evaluator";
import { adminApi, type DiagnosticQueueItem } from "@/lib/admin-api";

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

export function AdminDiagnosticsClient() {
  const [items, setItems] = useState<DiagnosticQueueItem[]>([]);
  const [filter, setFilter] = useState<DiagnosticStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
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
      const res = await adminApi.listDiagnostics({
        status: filter === "all" ? undefined : filter,
        q: query || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setItems(res.items ?? []);
      setTotal(res.total);
      setPendingCount(res.pending_count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  }, [filter, page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFilterChange = (next: DiagnosticStatusFilter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <EvaluatorQueueHeader pendingCount={pendingCount} activeModule="diagnostics" />

      <form
        className="relative w-full max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
          setPage(1);
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          className="h-10 w-full rounded-xl border border-[#E8EDF3] bg-white pr-3 pl-9 text-sm text-navy outline-none focus:border-cyan"
        />
      </form>

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
        <EvaluatorDiagnosticsQueueList
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
