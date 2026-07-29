"use client";

import {
  evaluatorChip,
  evaluatorChipSelected,
  evaluatorTitle,
} from "@/components/admin/evaluator/evaluator-ui";
import {
  bandChipValues,
  CRITERIA_DESCRIPTIONS,
  CRITERIA_KEYS,
  CRITERIA_LABELS,
  type HumanCriteriaScores,
} from "@/lib/speaking-band";
import { cn } from "@/lib/utils";

type Props = {
  scores: Partial<HumanCriteriaScores>;
  onChange: (key: keyof HumanCriteriaScores, value: number) => void;
  readOnly?: boolean;
  /** Criterion keys that differ from AI (≥ 0.5) */
  overriddenKeys?: ReadonlySet<string>;
};

const CHIPS = bandChipValues(4, 9);

export function EvaluatorCriteriaRubric({
  scores,
  onChange,
  readOnly = false,
  overriddenKeys,
}: Props) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h3 className={evaluatorTitle}>Marking rubric</h3>
        <p className="font-mono text-[11px] text-[#94A3B8]">
          Select a half-band per criterion
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {CRITERIA_KEYS.map((key) => (
          <div
            key={key}
            className={cn(
              "flex flex-col gap-3 rounded-[14px] border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-[18px]",
              overriddenKeys?.has(key)
                ? "border-[#FDE68A] bg-[#FFFBEB]/40"
                : "border-[#EAEEF3]",
            )}
          >
            <div className="min-w-0 sm:w-[220px] sm:shrink-0">
              <p className="text-[14.5px] font-semibold text-navy">
                {CRITERIA_LABELS[key]}
                {overriddenKeys?.has(key) ? (
                  <span className="ml-2 text-[10px] font-bold uppercase text-[#B45309]">
                    vs AI
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs font-light text-[#94A3B8]">
                {CRITERIA_DESCRIPTIONS[key]}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 pb-0.5 sm:max-w-[420px] sm:flex-nowrap sm:overflow-x-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden">
              {CHIPS.map((band) => {
                const selected = scores[key] === band;
                return (
                  <button
                    key={band}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange(key, band)}
                    className={cn(
                      evaluatorChip,
                      selected && evaluatorChipSelected,
                      readOnly && "cursor-default opacity-80",
                    )}
                  >
                    {band.toFixed(1)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
