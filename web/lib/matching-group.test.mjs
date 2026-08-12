import assert from "node:assert/strict";
import test from "node:test";

const ROMAN_ORDER = ["i", "ii", "iii", "iv", "v", "vi", "vii"];

function romanLabel(index) {
  return ROMAN_ORDER[index] ?? String(index + 1);
}

function relabelOptions(options) {
  return options.map((o, i) => ({ ...o, label: romanLabel(i) }));
}

function matchingGroupToQuestions(draft) {
  const options = relabelOptions(
    draft.options.map((o) => ({ ...o, text: o.text.trim() })),
  );
  return draft.slots.map((slot) => ({
    localId: slot.id,
    serverId: slot.serverId,
    type: draft.type,
    prompt: slot.prompt.trim(),
    difficulty: draft.difficulty,
    options: options.map((o) => ({
      label: o.label,
      text: o.text || o.label,
      correct: o.label === slot.assignedLabel,
    })),
  }));
}

function matchingQuestionsToPayload(questions) {
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

function matchingGroupError(draft) {
  if (draft.options.some((o) => !o.text.trim())) return "Every option card needs text.";
  if (draft.slots.some((s) => !s.assignedLabel)) return "Drop an option onto every slot.";
  return null;
}

function findConsecutiveTypeRange(questions, index) {
  const type = questions[index]?.type;
  let start = index;
  let end = index;
  while (start > 0 && questions[start - 1]?.type === type) start -= 1;
  while (end < questions.length - 1 && questions[end + 1]?.type === type) end += 1;
  return { start, end };
}

test("matching group expands to N payloads with shared options and one correct label", () => {
  const draft = {
    type: "Matching headings",
    difficulty: "medium",
    options: [
      { id: "1", label: "i", text: "Human qualities" },
      { id: "2", label: "ii", text: "Insects" },
      { id: "3", label: "iii", text: "Planning with tools" },
    ],
    slots: [
      { id: "s1", prompt: "Paragraph C", assignedLabel: "iii" },
      { id: "s2", prompt: "Paragraph D", assignedLabel: "i" },
    ],
  };
  const questions = matchingGroupToQuestions(draft);
  const payload = matchingQuestionsToPayload(questions);
  assert.equal(payload.length, 2);
  assert.deepEqual(
    payload[0].options.map((o) => o.label),
    ["i", "ii", "iii"],
  );
  assert.deepEqual(payload[0].options, payload[1].options);
  assert.equal(payload[0].correct_answer, "iii");
  assert.equal(payload[1].correct_answer, "i");
  assert.equal(payload[0].prompt, "Paragraph C");
  assert.equal(payload[0].options[2].text, "Planning with tools");
});

test("matching group requires assignment on every slot", () => {
  const err = matchingGroupError({
    options: [
      { text: "A" },
      { text: "B" },
    ],
    slots: [{ assignedLabel: "i" }, { assignedLabel: "" }],
  });
  assert.equal(err, "Drop an option onto every slot.");
});

test("consecutive matching questions form one group range", () => {
  const questions = [
    { type: "True/False/Not Given" },
    { type: "Matching headings" },
    { type: "Matching headings" },
    { type: "Sentence completion" },
  ];
  assert.deepEqual(findConsecutiveTypeRange(questions, 2), { start: 1, end: 2 });
});
