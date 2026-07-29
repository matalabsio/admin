"use client";

import { evaluatorMeta } from "@/components/admin/evaluator/evaluator-ui";

type Props = {
  overall: number | null;
  reviewStatus?: string;
};

export function EvaluatorOverallBand({ overall, reviewStatus }: Props) {
  const pending =
    reviewStatus === "pending" ||
    reviewStatus === "in_review" ||
    (overall == null && reviewStatus !== "completed");

  return (
    <div className="shrink-0 rounded-2xl bg-navy px-5 py-4 text-white sm:min-w-[200px]">
      <p className={evaluatorMeta}>Overall band</p>
      {pending ? (
        <>
          <p className="mt-2 font-display text-2xl font-bold text-[#FDCB6E]">
            Pending
          </p>
          <p className="mt-2 max-w-xs text-xs font-light leading-relaxed text-[#C6D4E5]">
            Auto-calculated once all four criteria are selected.
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 font-mono text-[3.25rem] font-medium leading-[0.85] text-cyan sm:text-[3.375rem]">
            {overall != null ? overall.toFixed(1) : "—"}
          </p>
          <p className="mt-2.5 max-w-xs text-xs font-light leading-relaxed text-[#C6D4E5]">
            Auto-calculated from the four criteria, rounded to the nearest
            half-band.
          </p>
        </>
      )}
    </div>
  );
}
