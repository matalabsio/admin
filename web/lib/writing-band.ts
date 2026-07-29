/** IELTS writing criteria band math for evaluator portal. */

export type WritingHumanCriteriaScores = {
  task_achievement: number;
  coherence: number;
  lexical_resource: number;
  grammar: number;
};

export const WRITING_CRITERIA_KEYS: (keyof WritingHumanCriteriaScores)[] = [
  "task_achievement",
  "coherence",
  "lexical_resource",
  "grammar",
];

export const WRITING_CRITERIA_LABELS: Record<keyof WritingHumanCriteriaScores, string> = {
  task_achievement: "Task Achievement",
  coherence: "Coherence & Cohesion",
  lexical_resource: "Lexical Resource",
  grammar: "Grammatical Range & Accuracy",
};

export const WRITING_CRITERIA_DESCRIPTIONS: Record<
  keyof WritingHumanCriteriaScores,
  string
> = {
  task_achievement: "Addresses all parts of the task",
  coherence: "Logical organisation and linking",
  lexical_resource: "Range and precision of vocabulary",
  grammar: "Variety and accuracy of structures",
};

export function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function computeWritingOverallBand(
  scores: Partial<WritingHumanCriteriaScores>,
): number | null {
  const values = WRITING_CRITERIA_KEYS.map((key) => scores[key]);
  if (values.some((v) => v == null || Number.isNaN(v))) {
    return null;
  }
  const nums = values as number[];
  const mean = nums.reduce((sum, v) => sum + v, 0) / nums.length;
  return roundHalf(mean);
}

export function bandChipValues(min = 0, max = 9): number[] {
  const chips: number[] = [];
  for (let v = min; v <= max; v += 0.5) {
    chips.push(v);
  }
  return chips;
}

export function aiScoresToWritingCriteria(
  aiScores: Record<string, unknown> | null | undefined,
): WritingHumanCriteriaScores | null {
  if (!aiScores) return null;
  const nested =
    aiScores.criteria_scores && typeof aiScores.criteria_scores === "object"
      ? aiScores.criteria_scores
      : aiScores.criteria && typeof aiScores.criteria === "object"
        ? aiScores.criteria
        : null;
  const source =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : aiScores;
  const task_achievement = source.task_achievement;
  const coherence = source.coherence;
  const lexical_resource = source.lexical_resource;
  const grammar = source.grammar;
  if (
    task_achievement == null ||
    coherence == null ||
    lexical_resource == null ||
    grammar == null
  ) {
    return null;
  }
  return {
    task_achievement: Number(task_achievement),
    coherence: Number(coherence),
    lexical_resource: Number(lexical_resource),
    grammar: Number(grammar),
  };
}

export function defaultWritingCriteriaFromReview(
  human: WritingHumanCriteriaScores | null | undefined,
  aiScores: Record<string, unknown> | null | undefined,
): WritingHumanCriteriaScores | null {
  if (human) return human;
  return aiScoresToWritingCriteria(aiScores);
}
