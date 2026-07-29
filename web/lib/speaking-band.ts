/** IELTS speaking criteria band math for evaluator portal. */

export type HumanCriteriaScores = {
  fluency: number;
  lexical: number;
  grammar: number;
  pronunciation: number;
};

export const CRITERIA_KEYS: (keyof HumanCriteriaScores)[] = [
  "fluency",
  "lexical",
  "grammar",
  "pronunciation",
];

export const CRITERIA_LABELS: Record<keyof HumanCriteriaScores, string> = {
  fluency: "Fluency & Coherence",
  lexical: "Lexical Resource",
  grammar: "Grammatical Range & Accuracy",
  pronunciation: "Pronunciation",
};

export const CRITERIA_DESCRIPTIONS: Record<keyof HumanCriteriaScores, string> = {
  fluency: "Flow, pace, linking of ideas",
  lexical: "Range & precision of vocabulary",
  grammar: "Variety & accuracy of structures",
  pronunciation: "Clarity, stress, and intonation",
};

export function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function computeOverallBand(scores: Partial<HumanCriteriaScores>): number | null {
  const values = CRITERIA_KEYS.map((key) => scores[key]);
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

export function aiScoresToCriteria(
  aiScores: Record<string, unknown> | null | undefined,
): HumanCriteriaScores | null {
  if (!aiScores) return null;
  const fluency = aiScores.fluency;
  const lexical = aiScores.lexical;
  const grammar = aiScores.grammar;
  const pronunciation = aiScores.pronunciation;
  if (
    fluency == null ||
    lexical == null ||
    grammar == null ||
    pronunciation == null
  ) {
    return null;
  }
  return {
    fluency: Number(fluency),
    lexical: Number(lexical),
    grammar: Number(grammar),
    pronunciation: Number(pronunciation),
  };
}

export function defaultCriteriaFromReview(
  human: HumanCriteriaScores | null | undefined,
  aiScores: Record<string, unknown> | null | undefined,
): HumanCriteriaScores | null {
  if (human) return human;
  return aiScoresToCriteria(aiScores);
}
