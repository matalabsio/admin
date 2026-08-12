export type MatchingLabelFormat = "roman" | "letter";

export type MatchingPoolOption = {
  id: string;
  label: string;
  text: string;
};

export type MatchingSlot = {
  id: string;
  serverId?: string;
  prompt: string;
  assignedLabel: string;
};

export type MatchingGroupDraft = {
  type: string;
  instruction: string;
  difficulty: "easy" | "medium" | "hard";
  format: MatchingLabelFormat;
  options: MatchingPoolOption[];
  slots: MatchingSlot[];
};

export type MatchingGroupQuestion = {
  localId: string;
  serverId?: string;
  type: string;
  prompt: string;
  options: Array<{ label: string; text: string; correct: boolean }>;
  difficulty: "easy" | "medium" | "hard";
};

export const ROMAN_ORDER = [
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
] as const;

const ROMAN_LONGEST_FIRST = [
  "viii",
  "vii",
  "iii",
  "ix",
  "vi",
  "iv",
  "ii",
  "x",
  "i",
  "v",
] as const;

export const READING_MATCHING_TYPES = new Set([
  "Matching headings",
  "Matching information",
  "Matching features",
  "Matching sentence endings",
]);

export function isReadingMatchingType(type: string): boolean {
  return READING_MATCHING_TYPES.has(type);
}

export function isListeningMatchingType(type: string): boolean {
  return type === "Matching";
}

export function matchingLabelFormat(type: string): MatchingLabelFormat {
  return type === "Matching headings" ? "roman" : "letter";
}

export function romanLabel(index: number): string {
  return ROMAN_ORDER[index] ?? String(index + 1);
}

export function letterLabel(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  return String(index + 1);
}

export function nextMatchingLabel(
  format: MatchingLabelFormat,
  index: number,
): string {
  return format === "roman" ? romanLabel(index) : letterLabel(index);
}

export function normalizeRoman(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\./g, "");
  if (!t) return "";
  for (const roman of ROMAN_LONGEST_FIRST) {
    if (t === roman || t.startsWith(roman)) return roman;
  }
  return t.slice(0, 3);
}

export function normalizeLetter(raw: string): string {
  const letter = raw.trim().toUpperCase().replace(/[^A-Z]/g, "");
  return letter.slice(0, 1);
}

export function normalizeMatchingLabel(
  raw: string,
  format: MatchingLabelFormat,
): string {
  return format === "roman" ? normalizeRoman(raw) : normalizeLetter(raw);
}

export function relabelOptions(
  options: MatchingPoolOption[],
  format: MatchingLabelFormat,
): MatchingPoolOption[] {
  return options.map((o, i) => ({
    ...o,
    label: nextMatchingLabel(format, i),
  }));
}

export function splitOptionLabelText(
  label: string,
  text: string,
  format: MatchingLabelFormat,
): { label: string; text: string } {
  const rawLabel = (label || "").trim();
  const rawText = (text || "").trim();
  const normalized = normalizeMatchingLabel(rawLabel, format);
  if (!normalized) {
    return { label: rawLabel, text: rawText || rawLabel };
  }
  const lower = rawLabel.toLowerCase();
  const starts =
    format === "roman"
      ? lower.startsWith(normalized)
      : rawLabel.toUpperCase().startsWith(normalized);
  if (starts && rawLabel.length > normalized.length) {
    const rest = rawLabel.slice(normalized.length).replace(/^[\s.—–-]+/, "");
    const body =
      rawText && rawText !== rawLabel ? rawText : rest || rawText;
    return { label: normalized, text: body };
  }
  if (rawText && rawText !== rawLabel) {
    return { label: normalized, text: rawText };
  }
  return { label: normalized, text: rawText || rawLabel };
}

export function defaultMatchingGroup(type: string): MatchingGroupDraft {
  const format = matchingLabelFormat(type);
  const optionCount = format === "roman" ? 7 : 5;
  const options = Array.from({ length: optionCount }, (_, i) => ({
    id: `opt-${i + 1}`,
    label: nextMatchingLabel(format, i),
    text: "",
  }));
  const slotPrompts =
    type === "Matching headings"
      ? ["Paragraph C", "Paragraph D", "Paragraph E", "Paragraph F"]
      : ["", ""];
  return {
    type,
    instruction: "",
    difficulty: "medium",
    format,
    options,
    slots: slotPrompts.map((prompt, i) => ({
      id: `slot-${i + 1}`,
      prompt,
      assignedLabel: "",
    })),
  };
}

export function findConsecutiveTypeRange(
  questions: Array<{ type: string }>,
  index: number,
): { start: number; end: number } {
  const type = questions[index]?.type;
  if (!type) return { start: index, end: index };
  let start = index;
  let end = index;
  while (start > 0 && questions[start - 1]?.type === type) start -= 1;
  while (end < questions.length - 1 && questions[end + 1]?.type === type) {
    end += 1;
  }
  return { start, end };
}

export function questionsToMatchingGroup(
  type: string,
  questions: Array<{
    localId: string;
    serverId?: string;
    prompt: string;
    options: Array<{ label: string; text?: string; correct?: boolean }> | null;
    difficulty?: "easy" | "medium" | "hard";
  }>,
): MatchingGroupDraft {
  const format = matchingLabelFormat(type);
  const first = questions[0];
  const rawOptions = first?.options ?? [];
  const options = relabelOptions(
    rawOptions.map((o, i) => {
      const split = splitOptionLabelText(o.label || "", o.text || "", format);
      return {
        id: `opt-${i + 1}`,
        label: split.label || nextMatchingLabel(format, i),
        text: split.text,
      };
    }),
    format,
  );
  const slots: MatchingSlot[] = questions.map((q, i) => {
    const correct = (q.options ?? []).find((o) => o.correct);
    const assigned = correct
      ? normalizeMatchingLabel(correct.label, format)
      : "";
    return {
      id: q.localId,
      serverId: q.serverId,
      prompt: q.prompt,
      assignedLabel: assigned,
    };
  });
  return {
    type,
    instruction: "",
    difficulty: first?.difficulty === "easy" || first?.difficulty === "hard"
      ? first.difficulty
      : "medium",
    format,
    options: options.length
      ? options
      : defaultMatchingGroup(type).options,
    slots: slots.length ? slots : defaultMatchingGroup(type).slots,
  };
}

export function matchingGroupToQuestions(
  draft: MatchingGroupDraft,
): MatchingGroupQuestion[] {
  const options = relabelOptions(
    draft.options.map((o) => ({
      ...o,
      text: o.text.trim(),
    })),
    draft.format,
  );
  return draft.slots.map((slot) => {
    const assigned = normalizeMatchingLabel(slot.assignedLabel, draft.format);
    return {
      localId: slot.id,
      serverId: slot.serverId,
      type: draft.type,
      prompt: slot.prompt.trim(),
      difficulty: draft.difficulty,
      options: options.map((o) => ({
        label: o.label,
        text: o.text || o.label,
        correct: normalizeMatchingLabel(o.label, draft.format) === assigned,
      })),
    };
  });
}

export function matchingGroupError(draft: MatchingGroupDraft): string | null {
  if (draft.options.length < 2) return "Add at least two options.";
  if (draft.options.some((o) => !o.text.trim())) {
    return "Every option card needs text.";
  }
  if (draft.slots.length < 1) return "Add at least one question slot.";
  if (draft.slots.some((s) => !s.prompt.trim())) {
    return "Every slot needs question text.";
  }
  if (draft.slots.some((s) => !normalizeMatchingLabel(s.assignedLabel, draft.format))) {
    return "Drop an option onto every slot.";
  }
  const used = new Set<string>();
  for (const slot of draft.slots) {
    const label = normalizeMatchingLabel(slot.assignedLabel, draft.format);
    if (used.has(label)) return "Each option can only be used once.";
    used.add(label);
  }
  return null;
}

export function matchingQuestionsToPayload(
  questions: MatchingGroupQuestion[],
): Array<{
  question_type: string;
  prompt: string;
  options: Array<{ label: string; text: string }>;
  correct_answer: string;
  alt_answers: string[];
  skill_tag: null;
  difficulty: "easy" | "medium" | "hard";
}> {
  return questions.map((q) => {
    const correct = q.options.find((o) => o.correct);
    return {
      question_type: q.type,
      prompt: q.prompt,
      options: q.options.map((o) => ({ label: o.label, text: o.text })),
      correct_answer: correct?.label ?? "",
      alt_answers: [],
      skill_tag: null,
      difficulty: q.difficulty,
    };
  });
}

type ExclusiveAssignResult =
  | { ok: true; next: Record<string, string> }
  | { ok: false };

export function assignMatchingLabel(params: {
  answers: Record<string, string>;
  slotIds: string[];
  targetId: string;
  label: string;
  format: MatchingLabelFormat;
  sourceId?: string | null;
}): ExclusiveAssignResult {
  const { answers, slotIds, targetId, format, sourceId = null } = params;
  const label = normalizeMatchingLabel(params.label, format);
  if (!label) return { ok: false };
  const targetCurrent = normalizeMatchingLabel(answers[targetId] ?? "", format);
  if (targetCurrent && targetCurrent !== label) return { ok: false };

  const next = { ...answers };
  if (sourceId && normalizeMatchingLabel(next[sourceId] ?? "", format) === label) {
    next[sourceId] = "";
  } else {
    for (const id of slotIds) {
      if (id === targetId) continue;
      if (normalizeMatchingLabel(next[id] ?? "", format) === label) {
        next[id] = "";
      }
    }
  }
  next[targetId] = label;
  return { ok: true, next };
}
