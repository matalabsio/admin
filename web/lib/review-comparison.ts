/** AI vs human score comparison helpers for evaluator portal. */

import {
  aiScoresToCriteria,
  computeOverallBand,
  CRITERIA_KEYS,
  type HumanCriteriaScores,
} from "@/lib/speaking-band";
import {
  aiScoresToWritingCriteria,
  computeWritingOverallBand,
  WRITING_CRITERIA_KEYS,
  type WritingHumanCriteriaScores,
} from "@/lib/writing-band";

export type CriterionDelta = {
  key: string;
  label: string;
  ai: number | null;
  human: number | null;
  delta: number | null;
  overridden: boolean;
};

export type ScoreComparison = {
  rows: CriterionDelta[];
  aiOverall: number | null;
  humanOverall: number | null;
  deltaOverall: number | null;
  overridden: boolean;
};

const OVERRIDE_THRESHOLD = 0.5;

function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function deltaBetween(human: number | null, ai: number | null): number | null {
  if (human == null || ai == null) return null;
  return roundHalf(human - ai);
}

export function compareSpeakingScores(
  human: Partial<HumanCriteriaScores> | null | undefined,
  aiScores: Record<string, unknown> | null | undefined,
  labels: Record<keyof HumanCriteriaScores, string>,
): ScoreComparison {
  const ai = aiScoresToCriteria(aiScores);
  const rows: CriterionDelta[] = CRITERIA_KEYS.map((key) => {
    const aiVal = ai?.[key] ?? null;
    const humanVal =
      human && human[key] != null ? Number(human[key]) : null;
    const delta = deltaBetween(humanVal, aiVal);
    return {
      key,
      label: labels[key],
      ai: aiVal,
      human: humanVal,
      delta,
      overridden: delta != null && Math.abs(delta) >= OVERRIDE_THRESHOLD,
    };
  });
  const aiOverall = ai ? computeOverallBand(ai) : null;
  const humanOverall =
    human && CRITERIA_KEYS.every((k) => human[k] != null)
      ? computeOverallBand(human as HumanCriteriaScores)
      : null;
  const deltaOverall = deltaBetween(humanOverall, aiOverall);
  return {
    rows,
    aiOverall,
    humanOverall,
    deltaOverall,
    overridden:
      rows.some((r) => r.overridden) ||
      (deltaOverall != null && Math.abs(deltaOverall) >= OVERRIDE_THRESHOLD),
  };
}

export function compareWritingScores(
  human: Partial<WritingHumanCriteriaScores> | null | undefined,
  aiScores: Record<string, unknown> | null | undefined,
  labels: Record<keyof WritingHumanCriteriaScores, string>,
): ScoreComparison {
  const ai = aiScoresToWritingCriteria(aiScores);
  const rows: CriterionDelta[] = WRITING_CRITERIA_KEYS.map((key) => {
    const aiVal = ai?.[key] ?? null;
    const humanVal =
      human && human[key] != null ? Number(human[key]) : null;
    const delta = deltaBetween(humanVal, aiVal);
    return {
      key,
      label: labels[key],
      ai: aiVal,
      human: humanVal,
      delta,
      overridden: delta != null && Math.abs(delta) >= OVERRIDE_THRESHOLD,
    };
  });
  const aiOverall = ai ? computeWritingOverallBand(ai) : null;
  const humanOverall =
    human && WRITING_CRITERIA_KEYS.every((k) => human[k] != null)
      ? computeWritingOverallBand(human as WritingHumanCriteriaScores)
      : null;
  const deltaOverall = deltaBetween(humanOverall, aiOverall);
  return {
    rows,
    aiOverall,
    humanOverall,
    deltaOverall,
    overridden:
      rows.some((r) => r.overridden) ||
      (deltaOverall != null && Math.abs(deltaOverall) >= OVERRIDE_THRESHOLD),
  };
}

export function formatDelta(delta: number | null): string {
  if (delta == null) return "—";
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
}
