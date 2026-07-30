"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  adminApi,
  type ReadingBuilderQuestionIn,
  type ReadingBuilderQuestionOut,
} from "@/lib/admin-api";
import { AdminBuilderStickyBar } from "@/components/admin/admin-builder-sticky-bar";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminLink,
  adminMutedLabel,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Question-type configuration                                       */
/* ------------------------------------------------------------------ */

const ALL_TYPES = [
  "True/False/Not Given",
  "Yes/No/Not Given",
  "Matching headings",
  "Sentence completion",
  "Matching information",
  "Matching features",
  "Matching sentence endings",
  "Summary completion (from box)",
  "Summary completion (from passage)",
  "Note completion",
  "Table completion",
  "Flow-chart completion",
  "Short answer questions",
  "Multiple choice",
] as const;

type QType = (typeof ALL_TYPES)[number];

const FIXED_OPTIONS: Partial<Record<QType, string[]>> = {
  "True/False/Not Given": ["TRUE", "FALSE", "NOT GIVEN"],
  "Yes/No/Not Given": ["YES", "NO", "NOT GIVEN"],
};

const CHECKBOX_TYPES = new Set<QType>([
  "Matching headings",
  "Matching information",
  "Matching features",
  "Matching sentence endings",
  "Summary completion (from box)",
]);

const TEXT_TYPES = new Set<QType>([
  "Sentence completion",
  "Summary completion (from passage)",
  "Note completion",
  "Table completion",
  "Flow-chart completion",
  "Short answer questions",
]);

function isOptionType(t: string): boolean {
  return (
    t in FIXED_OPTIONS ||
    CHECKBOX_TYPES.has(t as QType) ||
    t === "Multiple choice"
  );
}
function isTextType(t: string): boolean {
  return TEXT_TYPES.has(t as QType);
}
function hasFixedOptions(t: string): boolean {
  return t in FIXED_OPTIONS;
}
function isCheckbox(t: string): boolean {
  return CHECKBOX_TYPES.has(t as QType);
}

/* slug → display mapping (reverse of backend question_types.py) */
const SLUG_TO_UI: Record<string, string> = {
  tfng: "True/False/Not Given",
  ynng: "Yes/No/Not Given",
  mcq: "Multiple choice",
  matching_headings: "Matching headings",
  matching_information: "Matching information",
  matching_features: "Matching features",
  matching_sentence_endings: "Matching sentence endings",
  summary_completion_box: "Summary completion (from box)",
  summary_completion_passage: "Summary completion (from passage)",
  note_completion: "Note completion",
  table_completion: "Table completion",
  flowchart_completion: "Flow-chart completion",
  short_answer: "Short answer questions",
  sentence_completion: "Sentence completion",
};

function toDisplay(slug: string): string {
  return SLUG_TO_UI[slug] ?? slug;
}

/* ------------------------------------------------------------------ */
/*  Draft question state                                              */
/* ------------------------------------------------------------------ */

type DraftOption = {
  id: string;
  label: string;
  correct: boolean;
  locked: boolean;
};
type DraftAlt = { id: string; value: string };
type Draft = {
  type: string;
  text: string;
  options: DraftOption[];
  answer: string;
  altAnswers: DraftAlt[];
};
type LocalQuestion = {
  localId: string;
  serverId?: string;
  type: string;
  text: string;
  options: DraftOption[] | null;
  answer: string;
  altAnswers: string[];
};

let _uid = 1;
function uid() {
  return `lq-${_uid++}`;
}

function makeDefaultOptions(type: string): DraftOption[] {
  const fixed = FIXED_OPTIONS[type as QType];
  if (fixed)
    return fixed.map((l, i) => ({
      id: `fo-${i}`,
      label: l,
      correct: false,
      locked: true,
    }));
  if (type === "Multiple choice")
    return ["A", "B", "C", "D"].map((l, i) => ({
      id: `mo-${i}`,
      label: "",
      correct: false,
      locked: false,
    }));
  return [1, 2, 3, 4].map((n) => ({
    id: `co-${n}`,
    label: "",
    correct: false,
    locked: false,
  }));
}

function questionToPayload(q: LocalQuestion): ReadingBuilderQuestionIn {
  let correctAnswer = q.answer;
  if (isOptionType(q.type) && q.options) {
    const selected = q.options.filter((o) => o.correct);
    correctAnswer = selected.map((o) => o.label).join(",");
  }
  return {
    question_type: q.type,
    prompt: q.text,
    options: isOptionType(q.type) && q.options
      ? q.options.map((o) => ({ label: o.label, text: o.label }))
      : null,
    correct_answer: correctAnswer,
    alt_answers: q.altAnswers.filter(Boolean),
    skill_tag: null,
  };
}

function serverToLocal(q: ReadingBuilderQuestionOut): LocalQuestion {
  const displayType = toDisplay(q.question_type);
  let options: DraftOption[] | null = null;
  let answer = q.correct_answer;

  if (isOptionType(displayType) && q.options) {
    const correctSet = new Set(
      (q.correct_answer || "").split(",").map((s) => s.trim()),
    );
    options = q.options.map((o, i) => ({
      id: `so-${i}`,
      label: o.label || o.text || "",
      correct: correctSet.has(o.label || o.text || ""),
      locked: hasFixedOptions(displayType),
    }));
    answer = "";
  }

  return {
    localId: uid(),
    serverId: q.id,
    type: displayType,
    text: q.prompt,
    options,
    answer: isTextType(displayType) ? q.correct_answer : answer,
    altAnswers: q.alt_answers || [],
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

type Props = { mockId: string; part: number };

export function AdminReadingBuilderClient({ mockId, part }: Props) {
  const [passageText, setPassageText] = useState("");
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [selectedType, setSelectedType] = useState<string>(ALL_TYPES[0]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [mockTitle, setMockTitle] = useState<string>("");
  const [passageCount, setPassageCount] = useState(3);

  /* Load mock meta (title + passage count) once */
  useEffect(() => {
    void adminApi
      .getMock(mockId)
      .then((m) => {
        setMockTitle(m.title || "");
        setPassageCount(m.configured_reading_passages ?? 3);
      })
      .catch(() => {
        /* non-blocking — builder still works */
      });
  }, [mockId]);

  /* Load existing data */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.loadReadingPassage(mockId, part);
      setPassageText(res.passage_text || "");
      setQuestions(res.questions.map(serverToLocal));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [mockId, part]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Reset draft UI when switching passages */
  useEffect(() => {
    setDraftOpen(false);
    setDraft(null);
    setEditingId(null);
    setExpanded({});
    setPreviewMode(false);
    setSaveMsg(null);
  }, [part]);

  /* Word count */
  const wordCount = useMemo(() => {
    const t = passageText.trim();
    return t ? t.split(/\s+/).length : 0;
  }, [passageText]);

  /* Draft management */
  function openDraft() {
    const isOpt = isOptionType(selectedType);
    setDraft({
      type: selectedType,
      text: "",
      options: isOpt ? makeDefaultOptions(selectedType) : [],
      answer: "",
      altAnswers: [],
    });
    setEditingId(null);
    setDraftOpen(true);
  }

  function editQuestion(localId: string) {
    const q = questions.find((x) => x.localId === localId);
    if (!q) return;
    setDraft({
      type: q.type,
      text: q.text,
      options: q.options ? q.options.map((o) => ({ ...o })) : [],
      answer: q.answer || "",
      altAnswers: (q.altAnswers || []).map((v, i) => ({
        id: `a-${i}`,
        value: v,
      })),
    });
    setSelectedType(q.type);
    setEditingId(localId);
    setDraftOpen(true);
  }

  function cancelDraft() {
    setDraft(null);
    setEditingId(null);
    setDraftOpen(false);
  }

  function saveDraft() {
    if (!draft) return;
    if (!draft.text.trim()) {
      setError("Question text is required.");
      return;
    }
    if (isOptionType(draft.type)) {
      const hasCorrect = draft.options.some((o) => o.correct);
      if (!hasCorrect) {
        setError("Mark at least one correct option.");
        return;
      }
      if (draft.options.some((o) => !o.label.trim())) {
        setError("All options need text.");
        return;
      }
    }
    if (isTextType(draft.type) && !draft.answer.trim()) {
      setError("Correct answer is required.");
      return;
    }

    const record: LocalQuestion = {
      localId: editingId || uid(),
      type: draft.type,
      text: draft.text.trim(),
      options: isOptionType(draft.type) ? draft.options : null,
      answer: isTextType(draft.type) ? draft.answer.trim() : "",
      altAnswers: isTextType(draft.type)
        ? draft.altAnswers.map((a) => a.value).filter(Boolean)
        : [],
    };
    if (editingId) {
      const existing = questions.find((q) => q.localId === editingId);
      if (existing?.serverId) record.serverId = existing.serverId;
    }
    setError(null);
    setQuestions((prev) =>
      editingId
        ? prev.map((q) => (q.localId === editingId ? record : q))
        : [...prev, record],
    );
    cancelDraft();
  }

  function deleteQuestion(localId: string) {
    setQuestions((prev) => prev.filter((q) => q.localId !== localId));
  }

  function toggleExpand(localId: string) {
    setExpanded((prev) => ({ ...prev, [localId]: !prev[localId] }));
  }

  /* Draft option helpers */
  function toggleCorrect(optId: string) {
    if (!draft) return;
    const cb = isCheckbox(draft.type);
    setDraft({
      ...draft,
      options: draft.options.map((o) => {
        if (cb) return o.id === optId ? { ...o, correct: !o.correct } : o;
        return { ...o, correct: o.id === optId };
      }),
    });
  }
  function updateOptionLabel(optId: string, label: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      options: draft.options.map((o) =>
        o.id === optId ? { ...o, label } : o,
      ),
    });
  }
  function addOption() {
    if (!draft) return;
    setDraft({
      ...draft,
      options: [
        ...draft.options,
        { id: `no-${Date.now()}`, label: "", correct: false, locked: false },
      ],
    });
  }
  function removeOption(optId: string) {
    if (!draft) return;
    setDraft({ ...draft, options: draft.options.filter((o) => o.id !== optId) });
  }
  function addAlt() {
    if (!draft) return;
    setDraft({
      ...draft,
      altAnswers: [
        ...draft.altAnswers,
        { id: `alt-${Date.now()}`, value: "" },
      ],
    });
  }
  function updateAlt(altId: string, value: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      altAnswers: draft.altAnswers.map((a) =>
        a.id === altId ? { ...a, value } : a,
      ),
    });
  }
  function removeAlt(altId: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      altAnswers: draft.altAnswers.filter((a) => a.id !== altId),
    });
  }

  /* Save all — bulk replace (matches design sticky Save; persists passage + questions atomically) */
  async function handleSaveAll() {
    if (!passageText.trim()) {
      setError("Passage text is required.");
      return;
    }
    if (questions.length === 0) {
      setError("Add at least one question.");
      return;
    }
    const incomplete = questions.findIndex((q) => {
      if (!q.text.trim()) return true;
      if (isOptionType(q.type)) {
        return !q.options?.some((o) => o.correct);
      }
      if (isTextType(q.type)) return !q.answer.trim();
      return false;
    });
    if (incomplete >= 0) {
      setError(`Question ${incomplete + 1} is incomplete — fix it before saving.`);
      return;
    }
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      const payload = {
        passage_text: passageText,
        questions: questions.map(questionToPayload),
      };
      const res = await adminApi.saveReadingPassage(mockId, part, payload);
      setSaveMsg(`Saved ${res.questions_written} questions.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* Correct answer summary */
  function correctSummary(q: LocalQuestion): string {
    if (isOptionType(q.type) && q.options) {
      const labels = q.options
        .filter((o) => o.correct)
        .map((o) => o.label || "(untitled)");
      return labels.length
        ? `Correct: ${labels.join(", ")}`
        : "No correct answer marked";
    }
    if (q.answer) {
      const altCount = q.altAnswers?.length || 0;
      return `Answer: ${q.answer}${altCount ? ` (+ ${altCount} alt.)` : ""}`;
    }
    return "No answer set";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#94A3B8]">
        Loading passage…
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Preview mode                                                     */
  /* ---------------------------------------------------------------- */
  if (previewMode) {
    return (
      <div className="pb-24">
        <AdminPageHeader
          eyebrow={
            mockTitle
              ? `${mockTitle} · Reading`
              : `Passage ${part} · Reading`
          }
          title="Student preview"
          actions={
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={adminBtnSecondary}
            >
              Back to builder
            </button>
          }
        />
        <PassageTabs mockId={mockId} part={part} passageCount={passageCount} />
        <div className={cn(adminCard, "mt-6")}>
          <span className="mb-4 inline-block rounded-full bg-[#EEF1F5] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-[#64748B]">
            Student preview
          </span>
          <div className="mb-8 whitespace-pre-wrap text-[15px] leading-relaxed font-light text-[#28374E]">
            {passageText || "(no passage added yet)"}
          </div>
          {questions.length === 0 && (
            <p className="text-sm text-[#94A3B8]">No questions added yet.</p>
          )}
          {questions.map((q, i) => (
            <div
              key={q.localId}
              className="mb-6 border-b border-[#EEF1F5] pb-6 last:border-b-0"
            >
              <p className="mb-1.5 font-mono text-xs text-[#94A3B8]">
                Q{i + 1} · {q.type}
              </p>
              <p className="mb-3 text-[15px] font-semibold text-navy">
                {q.text || "(no question text)"}
              </p>
              {isOptionType(q.type) && q.options && (
                <div className="flex flex-col gap-2">
                  {q.options.map((o) => (
                    <label
                      key={o.id}
                      className="flex items-center gap-2.5 text-sm text-[#28374E]"
                    >
                      <input
                        type={isCheckbox(q.type) ? "checkbox" : "radio"}
                        disabled
                        className="size-4 accent-cyan"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              )}
              {isTextType(q.type) && (
                <input
                  type="text"
                  placeholder="Type your answer…"
                  disabled
                  className={cn(adminInput, "max-w-sm")}
                />
              )}
            </div>
          ))}
        </div>
        <AdminBuilderStickyBar
          mockId={mockId}
          activeModule="reading"
          label={`${questions.length} ${questions.length === 1 ? "question" : "questions"} added`}
          previewMode
          onTogglePreview={() => setPreviewMode(false)}
          onSave={handleSaveAll}
          saving={saving}
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Builder mode                                                     */
  /* ---------------------------------------------------------------- */
  return (
    <div className="pb-24">
      <AdminPageHeader
        eyebrow={
          mockTitle
            ? `${mockTitle} · Reading`
            : `Passage ${part} · Reading`
        }
        title="Reading builder"
        actions={
          <Link
            href={`/admin/mocks/${mockId}`}
            className={cn("text-sm", adminLink)}
          >
            ← Back to test
          </Link>
        }
      />

      <PassageTabs mockId={mockId} part={part} passageCount={passageCount} />

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-bold"
          >
            ×
          </button>
        </div>
      )}
      {saveMsg && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveMsg}
        </div>
      )}

      {/* Passage panel */}
      <div className={cn(adminCard, "mt-6")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={cn(adminHeading, "text-[17px]")}>
            Passage {part}
          </h2>
          <span className="font-mono text-xs text-[#94A3B8]">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>
        <textarea
          placeholder="Paste or type the reading passage here…"
          value={passageText}
          onChange={(e) => setPassageText(e.target.value)}
          rows={10}
          className={cn(
            adminInput,
            "mt-0 resize-y text-[14.5px] leading-relaxed font-light",
          )}
        />
      </div>

      {/* Question type selector */}
      <div className={cn(adminCard, "mt-5")}>
        <h2 className={cn(adminHeading, "mb-4 text-[17px]")}>
          Add a question
        </h2>
        <p className={cn(adminMutedLabel, "mb-2.5")}>Question type</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={cn(
                "cursor-pointer rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-semibold transition-all",
                t === selectedType
                  ? "border-cyan bg-cyan-soft/60 text-teal"
                  : "border-[#E4E9F0] bg-white text-[#5A6B82] hover:border-cyan",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={openDraft}
          className={cn(adminBtnPrimary, "gap-2")}
        >
          <Plus className="size-4" />
          Add question — {selectedType}
        </button>
      </div>

      {/* Draft question card */}
      {draftOpen && draft && (
        <div className="mt-5 rounded-[18px] border-[1.5px] border-cyan/40 bg-cyan-soft/20 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className={adminMutedLabel}>
              {editingId ? "Editing question" : "New question"} · {draft.type}
            </span>
            <button
              type="button"
              onClick={cancelDraft}
              className="text-sm font-semibold text-[#94A3B8] hover:text-navy"
            >
              Cancel
            </button>
          </div>

          <label className={cn(adminMutedLabel, "mb-2 block")}>
            Question text
          </label>
          <textarea
            placeholder="Enter the question or blank sentence…"
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            rows={2}
            className={cn(adminInput, "mt-0 mb-5 resize-y")}
          />

          {/* Option-based types */}
          {isOptionType(draft.type) && (
            <>
              <div className="mb-2.5 flex items-center justify-between">
                <span className={adminMutedLabel}>
                  Options —{" "}
                  {isCheckbox(draft.type)
                    ? "check all correct"
                    : "select the correct one"}
                </span>
                {!hasFixedOptions(draft.type) && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-xs font-semibold text-teal hover:text-cyan"
                  >
                    + Add option
                  </button>
                )}
              </div>
              <div className="mb-5 flex flex-col gap-2.5">
                {draft.options.map((o) => (
                  <div key={o.id} className="flex items-center gap-2.5">
                    <input
                      type={isCheckbox(draft.type) ? "checkbox" : "radio"}
                      name="draft-correct"
                      checked={o.correct}
                      onChange={() => toggleCorrect(o.id)}
                      className="size-[17px] accent-cyan"
                    />
                    <input
                      type="text"
                      placeholder="Option text…"
                      value={o.label}
                      onChange={(e) => updateOptionLabel(o.id, e.target.value)}
                      disabled={o.locked}
                      className={cn(
                        adminInput,
                        "mt-0 flex-1",
                        o.locked && "bg-[#F1F4F8]",
                      )}
                    />
                    {!hasFixedOptions(draft.type) && (
                      <button
                        type="button"
                        onClick={() => removeOption(o.id)}
                        className="px-1 text-red-500 hover:text-red-700"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Text-based types */}
          {isTextType(draft.type) && (
            <>
              <label className={cn(adminMutedLabel, "mb-2 block")}>
                Correct answer
              </label>
              <input
                type="text"
                placeholder="Correct answer…"
                value={draft.answer}
                onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                className={cn(adminInput, "mt-0 mb-4")}
              />
              <div className="mb-2.5 flex items-center justify-between">
                <span className={adminMutedLabel}>
                  Alternate accepted answers
                </span>
                <button
                  type="button"
                  onClick={addAlt}
                  className="text-xs font-semibold text-teal hover:text-cyan"
                >
                  + Add alternate
                </button>
              </div>
              <div className="mb-5 flex flex-col gap-2.5">
                {draft.altAnswers.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5">
                    <input
                      type="text"
                      placeholder="Alternate answer…"
                      value={a.value}
                      onChange={(e) => updateAlt(a.id, e.target.value)}
                      className={cn(adminInput, "mt-0 flex-1")}
                    />
                    <button
                      type="button"
                      onClick={() => removeAlt(a.id)}
                      className="px-1 text-red-500 hover:text-red-700"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={saveDraft}
              className={adminBtnPrimary}
            >
              {editingId ? "Save changes" : "Save question"}
            </button>
            <button
              type="button"
              onClick={cancelDraft}
              className={adminBtnSecondary}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Question list */}
      <div className={cn(adminCard, "mt-5")}>
        <h2 className={cn(adminHeading, "mb-4 text-[17px]")}>Questions</h2>
        {questions.length === 0 && (
          <p className="px-0.5 py-2 text-sm text-[#94A3B8]">
            No questions yet — pick a type above and add one.
          </p>
        )}
        <div className="flex flex-col gap-2.5">
          {questions.map((q, i) => (
            <div
              key={q.localId}
              className="rounded-[13px] border border-[#EAEEF3] transition-colors hover:border-[#D5DCE6]"
            >
              <div
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5"
                onClick={() => toggleExpand(q.localId)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 rounded-[7px] bg-cyan-soft px-2 py-1 font-mono text-xs font-semibold text-teal">
                    Q{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">
                      {q.type}
                    </p>
                    <p className="truncate text-sm font-semibold text-navy">
                      {q.text || "(no question text)"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      editQuestion(q.localId);
                    }}
                    className="text-xs font-semibold text-teal hover:text-cyan"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteQuestion(q.localId);
                    }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <ChevronDown
                    className={cn(
                      "size-4 text-[#94A3B8] transition-transform",
                      expanded[q.localId] && "rotate-180",
                    )}
                  />
                </div>
              </div>
              {expanded[q.localId] && (
                <div className="border-t border-[#F1F4F8] px-4 py-3">
                  <p className="mb-2 text-sm text-[#28374E]">
                    {q.text || "(no question text)"}
                  </p>
                  <p className="text-[13px] text-[#5A6B82]">
                    {correctSummary(q)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <AdminBuilderStickyBar
        mockId={mockId}
        activeModule="reading"
        label={`${questions.length} ${questions.length === 1 ? "question" : "questions"} added`}
        previewMode={false}
        onTogglePreview={() => setPreviewMode(true)}
        onSave={handleSaveAll}
        saving={saving}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Passage tabs                                                       */
/* ------------------------------------------------------------------ */

function PassageTabs({
  mockId,
  part,
  passageCount,
}: {
  mockId: string;
  part: number;
  passageCount: number;
}) {
  const count = Math.max(1, Math.min(4, passageCount || 1));
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className={adminMutedLabel}>Passages</span>
      {Array.from({ length: count }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={`/admin/mocks/${mockId}/reading/${p}`}
          className={cn(
            "rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-all",
            p === part
              ? "border-cyan bg-cyan-soft/60 text-teal"
              : "border-[#E4E9F0] bg-white text-[#5A6B82] hover:border-cyan",
          )}
        >
          Passage {p}
        </Link>
      ))}
    </div>
  );
}
