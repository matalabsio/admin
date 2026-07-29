"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  evaluatorCard,
  evaluatorCardPad,
  evaluatorTitle,
} from "@/components/admin/evaluator/evaluator-ui";
import {
  computeOverallBand,
  CRITERIA_KEYS,
  CRITERIA_LABELS,
} from "@/lib/speaking-band";
import {
  computeWritingOverallBand,
  WRITING_CRITERIA_KEYS,
  WRITING_CRITERIA_LABELS,
} from "@/lib/writing-band";
import { cn } from "@/lib/utils";

type Props = {
  aiScores: Record<string, unknown> | null;
  variant?: "speaking" | "writing";
};

function barWidth(band: number) {
  return `${Math.min(100, Math.max(0, (band / 9) * 100))}%`;
}

export function EvaluatorAiPrescore({ aiScores, variant = "speaking" }: Props) {
  const [shown, setShown] = useState(true);

  const isWriting = variant === "writing";
  const criteriaKeys = isWriting ? WRITING_CRITERIA_KEYS : CRITERIA_KEYS;
  const criteriaLabels = isWriting ? WRITING_CRITERIA_LABELS : CRITERIA_LABELS;

  const criteria = criteriaKeys.map((key) => ({
    key,
    label: criteriaLabels[key as keyof typeof criteriaLabels],
    value:
      aiScores?.[key] != null
        ? Number(aiScores[key])
        : isWriting &&
            aiScores?.criteria_scores &&
            typeof aiScores.criteria_scores === "object" &&
            (aiScores.criteria_scores as Record<string, unknown>)[key] != null
          ? Number((aiScores.criteria_scores as Record<string, unknown>)[key])
          : null,
  }));

  const overall = isWriting
    ? computeWritingOverallBand(
        Object.fromEntries(
          criteria
            .filter((c) => c.value != null)
            .map((c) => [c.key, c.value as number]),
        ) as Record<string, number>,
      )
    : computeOverallBand(
        Object.fromEntries(
          criteria
            .filter((c) => c.value != null)
            .map((c) => [c.key, c.value as number]),
        ) as Record<string, number>,
      );

  const estimateOnly =
    !criteria.some((c) => c.value != null) &&
    aiScores?.word_count_estimate != null;
  const estimateValue = estimateOnly ? Number(aiScores?.word_count_estimate) : null;

  const hasData = criteria.some((c) => c.value != null) || estimateOnly;

  return (
    <section className={cn(evaluatorCard, "overflow-hidden")}>
      <div className="flex items-center justify-between border-b border-[#F1F4F8] px-[18px] py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[30px] items-center justify-center rounded-lg bg-[#EEF6FF] text-[#1E63B8]">
            <Sparkles className="size-4" />
          </span>
          <h3 className={evaluatorTitle}>AI Pre-Score</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] text-[#94A3B8]">Shown</span>
          <button
            type="button"
            role="switch"
            aria-checked={shown}
            aria-label="Show AI pre-score"
            onClick={() => setShown((v) => !v)}
            className={cn(
              "relative h-5 w-[34px] cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
              shown ? "bg-cyan" : "bg-[#E4E9F0]",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all",
                shown ? "left-4" : "left-0.5",
              )}
            />
          </button>
        </div>
      </div>

      <div className={cn(evaluatorCardPad, !shown && "opacity-40")}>
        {!hasData ? (
          <p className="text-sm font-light text-[#5A6B82]">
            No AI scores available.
          </p>
        ) : estimateOnly ? (
          <>
            <div className="mb-4 flex items-center gap-3.5">
              <p className="font-mono text-[2.375rem] font-medium leading-[0.85] text-[#1E63B8]">
                {estimateValue != null ? estimateValue.toFixed(1) : "—"}
              </p>
              <p className="text-[12.5px] font-light leading-snug text-[#5A6B82]">
                Word-count estimate (admin reference only)
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3.5">
              <p className="font-mono text-[2.375rem] font-medium leading-[0.85] text-[#1E63B8]">
                {overall != null ? overall.toFixed(1) : "—"}
              </p>
              <p className="text-[12.5px] font-light leading-snug text-[#5A6B82]">
                {isWriting
                  ? "Estimated overall from AI writing evaluation"
                  : "Estimated overall from acoustic & transcript analysis"}
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {criteria.map(({ key, label, value }) => (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-[12.5px]">
                    <span className="text-[#5A6B82]">{label}</span>
                    <span className="font-mono font-medium text-navy">
                      {value != null ? value.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="h-[5px] overflow-hidden rounded-sm bg-[#EEF2F7]">
                    <div
                      className="h-full rounded-sm bg-[#1E63B8] transition-all duration-300"
                      style={{
                        width: value != null ? barWidth(value) : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
