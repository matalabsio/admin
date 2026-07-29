"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, type ReviewHistoryItem } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type Props = {
  reviewId: string;
  module: "speaking" | "writing";
  source?: "mock" | "diagnostic";
};

export function EvaluatorReviewHistory({
  reviewId,
  module,
  source = "mock",
}: Props) {
  const [items, setItems] = useState<ReviewHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        module === "speaking"
          ? await adminApi.getSpeakingHistory(reviewId)
          : await adminApi.getWritingHistory(reviewId, source);
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [module, reviewId, source]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <h3 className="text-[13px] font-bold text-navy">Review history</h3>
      {loading ? (
        <p className="mt-2 text-[12px] text-[#94A3B8]">Loading…</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-[12px] text-rose-600">{error}</p>
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <p className="mt-2 text-[12px] text-[#64748B]">
          No draft or approve events yet.
        </p>
      ) : null}
      {items.length > 0 ? (
        <ol className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "border-l-2 pl-3",
                item.action.endsWith(".approve")
                  ? "border-teal"
                  : "border-[#CBD5E1]",
              )}
            >
              <p className="text-[12px] font-medium text-[#334155]">
                {item.summary}
              </p>
              <p className="mt-0.5 text-[10px] text-[#94A3B8]">
                {new Date(item.created_at).toLocaleString()}
                {item.admin_email ? ` · ${item.admin_email}` : ""}
              </p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
