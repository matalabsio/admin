"use client";

import { formatDelta, type ScoreComparison } from "@/lib/review-comparison";
import { cn } from "@/lib/utils";

type Props = {
  comparison: ScoreComparison;
  onAcceptAi?: () => void;
  readOnly?: boolean;
  hasAi?: boolean;
};

export function EvaluatorScoreComparison({
  comparison,
  onAcceptAi,
  readOnly = false,
  hasAi = true,
}: Props) {
  if (!hasAi) {
    return (
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <h3 className="text-[13px] font-bold text-navy">AI vs Human</h3>
        <p className="mt-1 text-[12px] text-[#64748B]">
          No AI criteria available for this review yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-bold text-navy">AI vs Human</h3>
        {!readOnly && onAcceptAi ? (
          <button
            type="button"
            onClick={onAcceptAi}
            className="cursor-pointer rounded-lg border border-cyan/30 bg-cyan-soft/40 px-2.5 py-1 text-[11px] font-semibold text-teal transition-colors hover:bg-cyan-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
          >
            Copy AI scores
          </button>
        ) : null}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-[#F1F5F9] text-[10px] uppercase tracking-wide text-[#94A3B8]">
              <th className="py-1.5 pr-2 font-semibold">Criterion</th>
              <th className="py-1.5 px-1 font-semibold">AI</th>
              <th className="py-1.5 px-1 font-semibold">Human</th>
              <th className="py-1.5 pl-1 font-semibold">Δ</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr
                key={row.key}
                className={cn(
                  "border-b border-[#F8FAFC]",
                  row.overridden && "bg-[#FFFBEB]",
                )}
              >
                <td className="py-1.5 pr-2 font-medium text-[#334155]">
                  {row.label}
                </td>
                <td className="py-1.5 px-1 font-mono tabular-nums text-[#64748B]">
                  {row.ai != null ? row.ai.toFixed(1) : "—"}
                </td>
                <td className="py-1.5 px-1 font-mono tabular-nums text-navy">
                  {row.human != null ? row.human.toFixed(1) : "—"}
                </td>
                <td
                  className={cn(
                    "py-1.5 pl-1 font-mono tabular-nums",
                    row.overridden ? "font-semibold text-[#B45309]" : "text-[#64748B]",
                  )}
                >
                  {formatDelta(row.delta)}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2 pr-2 text-[#0D1F3C]">Overall</td>
              <td className="py-2 px-1 font-mono tabular-nums text-[#64748B]">
                {comparison.aiOverall != null
                  ? comparison.aiOverall.toFixed(1)
                  : "—"}
              </td>
              <td className="py-2 px-1 font-mono tabular-nums text-navy">
                {comparison.humanOverall != null
                  ? comparison.humanOverall.toFixed(1)
                  : "—"}
              </td>
              <td
                className={cn(
                  "py-2 pl-1 font-mono tabular-nums",
                  comparison.overridden
                    ? "text-[#B45309]"
                    : "text-[#64748B]",
                )}
              >
                {formatDelta(comparison.deltaOverall)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {comparison.overridden ? (
        <p className="mt-2 text-[11px] text-[#B45309]">
          Highlighted rows differ from AI by ≥ 0.5.
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-[#64748B]">
          Human scores align with AI within 0.5 bands.
        </p>
      )}
    </section>
  );
}
