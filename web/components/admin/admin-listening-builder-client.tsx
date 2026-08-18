"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  GripVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  adminApi,
  defaultListeningAudioKey,
  defaultBankListeningAudioKey,
  type ListeningBuilderQuestionIn,
  type ListeningBuilderQuestionOut,
} from "@/lib/admin-api";
import {
  type BuilderSource,
  builderBackHref,
  builderPartHref,
} from "@/components/admin/admin-builder-source";
import { AdminBuilderStickyBar } from "@/components/admin/admin-builder-sticky-bar";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSetWatchVideoCard } from "@/components/admin/admin-set-watch-video-card";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminLink,
  adminMeta,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";
import { AdminMatchingGroupEditor } from "@/components/admin/admin-matching-group-editor";
import { AdminInlineRichTextEditor } from "@/components/admin/admin-inline-rich-text-editor";
import { AdminRichTextPreview } from "@/components/admin/admin-rich-text-preview";
import { hasRichTextContent, richHtmlToPlainText } from "@/lib/rich-text-html";
import {
  defaultMatchingGroup,
  findConsecutiveTypeRange,
  isListeningMatchingType,
  matchingGroupError,
  matchingGroupToQuestions,
  questionsToMatchingGroup,
  type MatchingGroupDraft,
} from "@/lib/matching-group";

const ALL_TYPES = [
  "Form completion",
  "Note completion",
  "Sentence completion",
  "MCQ — single answer",
  "MCQ — choose TWO",
  "Matching",
  "Table completion",
  "Map/plan/diagram labelling",
  "Flow-chart completion",
  "Summary completion",
] as const;

type QType = (typeof ALL_TYPES)[number];

const RADIO_TYPES = new Set<QType>([
  "MCQ — single answer",
  "Map/plan/diagram labelling",
]);
const CHECKBOX_TWO = new Set<QType>(["MCQ — choose TWO"]);
const TEXT_TYPES = new Set<QType>([
  "Form completion",
  "Note completion",
  "Sentence completion",
  "Table completion",
  "Flow-chart completion",
  "Summary completion",
]);

function isOptionType(t: string): boolean {
  return (
    RADIO_TYPES.has(t as QType) ||
    CHECKBOX_TWO.has(t as QType) ||
    isListeningMatchingType(t)
  );
}
function isTextType(t: string): boolean {
  return TEXT_TYPES.has(t as QType);
}
function isCheckboxTwo(t: string): boolean {
  return CHECKBOX_TWO.has(t as QType);
}

type DraftOption = {
  id: string;
  /** Stable letter A–Z used as correct_answer / student selection key. */
  letter: string;
  /** Option body shown to students. */
  text: string;
  correct: boolean;
};
type DraftAlt = { id: string; value: string };
type Draft = {
  type: string;
  text: string;
  options: DraftOption[];
  answer: string;
  altAnswers: DraftAlt[];
  difficulty: "easy" | "medium" | "hard";
};
type LocalQuestion = {
  localId: string;
  serverId?: string;
  type: string;
  text: string;
  options: DraftOption[] | null;
  answer: string;
  altAnswers: string[];
  difficulty: "easy" | "medium" | "hard";
};

let _uid = 1;
function uid() {
  return `lq-${_uid++}`;
}

function optionLetter(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  return String(index + 1);
}

function makeDefaultOptions(): DraftOption[] {
  return ["A", "B", "C", "D"].map((letter, i) => ({
    id: `mo-${i}`,
    letter,
    text: "",
    correct: false,
  }));
}

function questionToPayload(q: LocalQuestion): ListeningBuilderQuestionIn {
  let correctAnswer = q.answer;
  if (isOptionType(q.type) && q.options) {
    const selected = q.options.filter((o) => o.correct);
    correctAnswer = selected.map((o) => o.letter).join(",");
  }
  return {
    question_type: q.type,
    prompt: q.text,
    options: isOptionType(q.type) && q.options
      ? q.options.map((o) => ({ label: o.letter, text: o.text.trim() || o.letter }))
      : null,
    correct_answer: correctAnswer,
    alt_answers: q.altAnswers.filter(Boolean),
    skill_tag: null,
    choose_two: isCheckboxTwo(q.type),
    difficulty: q.difficulty || "medium",
  };
}

function serverToLocal(q: ListeningBuilderQuestionOut): LocalQuestion {
  let displayType = q.question_type;
  if (q.choose_two && (displayType === "mcq" || displayType === "MCQ — single answer")) {
    displayType = "MCQ — choose TWO";
  }

  let options: DraftOption[] | null = null;
  let answer = q.correct_answer;

  if (isOptionType(displayType) && q.options) {
    const correctSet = new Set(
      (q.correct_answer || "").split(",").map((s) => s.trim()),
    );
    options = q.options.map((o, i) => {
      const letter =
        /^[A-Za-z]$/.test((o.label || "").trim())
          ? o.label.trim().toUpperCase()
          : optionLetter(i);
      const text =
        (o.text || "").trim() && (o.text || "").trim() !== (o.label || "").trim()
          ? (o.text || "").trim()
          : (o.label || o.text || "").trim();
      return {
        id: `so-${i}`,
        letter,
        text,
        correct:
          correctSet.has(letter) ||
          correctSet.has(o.label || "") ||
          correctSet.has(o.text || ""),
      };
    });
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
    difficulty:
      q.difficulty === "easy" || q.difficulty === "hard" || q.difficulty === "medium"
        ? q.difficulty
        : "medium",
  };
}

type Props = { source: BuilderSource; part: number };

export function AdminListeningBuilderClient({ source, part }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [selectedType, setSelectedType] = useState<string>(ALL_TYPES[0]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [matchingDraft, setMatchingDraft] = useState<MatchingGroupDraft | null>(
    null,
  );
  const [matchingRange, setMatchingRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [mockTitle, setMockTitle] = useState("");
  const [partCount, setPartCount] = useState(4);

  const [audioKey, setAudioKey] = useState("");
  const [audioName, setAudioName] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [audioInR2, setAudioInR2] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragOverAudio, setDragOverAudio] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const isBank = source.kind === "bank";

  const expectedKey = useMemo(
    () =>
      source.kind === "mock"
        ? defaultListeningAudioKey(source.mockId, part)
        : defaultBankListeningAudioKey(source.setId, part),
    [source, part],
  );

  useEffect(() => {
    if (source.kind === "mock") {
      void adminApi
        .getMock(source.mockId)
        .then((m) => {
          setMockTitle(m.title || "");
          setPartCount(m.configured_listening_parts ?? 4);
        })
        .catch(() => {});
      return;
    }
    void adminApi
      .getQuestionBankSet(source.setId)
      .then((s) => {
        setMockTitle(s.title || "");
        // Bank sets are one unit; still surface legacy multi-part if present.
        const parts = Math.max(
          1,
          ...(s.sections ?? []).map((sec) => sec.part),
        );
        setPartCount(parts);
      })
      .catch(() => {
        setPartCount(1);
      });
  }, [source]);

  const refreshAudioStatus = useCallback(
    async (key?: string) => {
      const k = (key || expectedKey).trim();
      if (!k) {
        setAudioInR2(null);
        return false;
      }
      try {
        const res =
          source.kind === "mock"
            ? await adminApi.checkListeningAudio(source.mockId, part, k)
            : await adminApi.checkBankListeningAudio(source.setId, part, k);
        const ok = Boolean(res.playable ?? res.exists_in_r2);
        setAudioInR2(ok);
        if (ok && res.audio_key) {
          setAudioKey(res.audio_key);
          setAudioName(res.audio_key.split("/").pop() || res.audio_key);
        }
        return ok;
      } catch {
        setAudioInR2(null);
        return false;
      }
    },
    [expectedKey, source, part],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        source.kind === "mock"
          ? await adminApi.loadListeningPart(source.mockId, part)
          : await adminApi.loadBankListeningPart(source.setId, part);
      setQuestions(res.questions.map(serverToLocal));
      const keyFromDb = (res.audio_key || "").trim();
      if (keyFromDb) {
        setAudioKey(keyFromDb);
        setAudioName(keyFromDb.split("/").pop() || keyFromDb);
        void refreshAudioStatus(keyFromDb);
      } else {
        void refreshAudioStatus(expectedKey).then((ok) => {
          if (!ok) {
            setAudioKey("");
            setAudioName("");
          }
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [expectedKey, source, part, refreshAudioStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setDraftOpen(false);
    setDraft(null);
    setMatchingDraft(null);
    setMatchingRange(null);
    setEditingId(null);
    setExpanded({});
    setPreviewMode(false);
    setSaveMsg(null);
    setPendingFile(null);
    setIsPlaying(false);
    setAudioKey("");
    setAudioName("");
    setAudioInR2(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on part change
  }, [part]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  function onFileChosen(file: File | null) {
    if (!file) return;
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    const url = URL.createObjectURL(file);
    setLocalPreviewUrl(url);
    setPendingFile(file);
    setAudioName(file.name);
    setIsPlaying(false);
  }

  async function uploadAudio() {
    if (!pendingFile) {
      setError("Choose an MP3 file first.");
      return;
    }
    setUploading(true);
    setError(null);
    setSaveMsg(null);
    try {
      const res =
        source.kind === "mock"
          ? await adminApi.uploadListeningAudio(source.mockId, part, pendingFile)
          : await adminApi.uploadBankListeningAudio(
              source.setId,
              part,
              pendingFile,
            );
      const key = res.audio_key || expectedKey;
      setAudioKey(key);
      setAudioName(pendingFile.name || key.split("/").pop() || key);
      setAudioInR2(true);
      setPendingFile(null);
      const ok = await refreshAudioStatus(key);
      setSaveMsg(
        ok
          ? "Audio uploaded to R2 — ready to save."
          : "Upload finished, but R2 check failed. Click Check R2, then Save.",
      );
      if (ok) setAudioInR2(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audio upload failed");
    } finally {
      setUploading(false);
    }
  }

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setIsPlaying(true);
    } else {
      a.pause();
      setIsPlaying(false);
    }
  }

  const onDropReorder = (toIndex: number) => {
    if (dragFrom == null || dragFrom === toIndex) {
      setDragFrom(null);
      return;
    }
    setQuestions((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(dragFrom, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
    setDragFrom(null);
  };

  function openDraft() {
    if (isListeningMatchingType(selectedType)) {
      setDraft(null);
      setDraftOpen(false);
      setEditingId(null);
      setMatchingDraft(defaultMatchingGroup(selectedType));
      setMatchingRange(null);
      return;
    }
    setMatchingDraft(null);
    setMatchingRange(null);
    setDraft({
      type: selectedType,
      text: "",
      options: isOptionType(selectedType) ? makeDefaultOptions() : [],
      answer: "",
      altAnswers: [],
      difficulty: "medium",
    });
    setEditingId(null);
    setDraftOpen(true);
  }

  function editQuestion(localId: string) {
    const q = questions.find((x) => x.localId === localId);
    if (!q) return;
    if (isListeningMatchingType(q.type)) {
      const idx = questions.findIndex((x) => x.localId === localId);
      const range = findConsecutiveTypeRange(questions, idx);
      const groupQs = questions.slice(range.start, range.end + 1);
      setMatchingDraft(
        questionsToMatchingGroup(
          q.type,
          groupQs.map((item) => ({
            localId: item.localId,
            serverId: item.serverId,
            prompt: item.text,
            options: (item.options ?? []).map((o) => ({
              label: o.letter,
              text: o.text,
              correct: o.correct,
            })),
            difficulty: item.difficulty,
          })),
        ),
      );
      setMatchingRange(range);
      setDraft(null);
      setDraftOpen(false);
      setSelectedType(q.type);
      setEditingId(null);
      return;
    }
    setMatchingDraft(null);
    setMatchingRange(null);
    setDraft({
      type: q.type,
      text: q.text,
      options: q.options ? q.options.map((o) => ({ ...o })) : [],
      answer: q.answer || "",
      altAnswers: (q.altAnswers || []).map((v, i) => ({
        id: `a-${i}`,
        value: v,
      })),
      difficulty: q.difficulty || "medium",
    });
    setSelectedType(q.type);
    setEditingId(localId);
    setDraftOpen(true);
  }

  function cancelDraft() {
    setDraft(null);
    setEditingId(null);
    setDraftOpen(false);
    setMatchingDraft(null);
    setMatchingRange(null);
  }

  function saveMatchingGroup() {
    if (!matchingDraft) return;
    const err = matchingGroupError(matchingDraft);
    if (err) {
      setError(err);
      return;
    }
    const built = matchingGroupToQuestions(matchingDraft);
    const records: LocalQuestion[] = built.map((q) => ({
      localId: q.localId,
      serverId: q.serverId,
      type: q.type,
      text: q.prompt,
      options: q.options.map((o, i) => ({
        id: `mo-${q.localId}-${i}`,
        letter: o.label,
        text: o.text,
        correct: o.correct,
      })),
      answer: "",
      altAnswers: [],
      difficulty: q.difficulty,
    }));
    setError(null);
    setQuestions((prev) => {
      if (matchingRange) {
        return [
          ...prev.slice(0, matchingRange.start),
          ...records,
          ...prev.slice(matchingRange.end + 1),
        ];
      }
      return [...prev, ...records];
    });
    cancelDraft();
  }

  function saveDraft() {
    if (!draft) return;
    if (!hasRichTextContent(draft.text)) {
      setError("Question text is required.");
      return;
    }
    if (isOptionType(draft.type)) {
      const correct = draft.options.filter((o) => o.correct);
      if (isCheckboxTwo(draft.type) && correct.length !== 2) {
        setError("Mark exactly two correct options.");
        return;
      }
      if (!isCheckboxTwo(draft.type) && correct.length !== 1) {
        setError("Mark one correct option.");
        return;
      }
      if (draft.options.some((o) => !o.text.trim())) {
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
      text: draft.text,
      options: isOptionType(draft.type) ? draft.options : null,
      answer: isTextType(draft.type) ? draft.answer.trim() : "",
      altAnswers: isTextType(draft.type)
        ? draft.altAnswers.map((a) => a.value).filter(Boolean)
        : [],
      difficulty: draft.difficulty || "medium",
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

  function toggleCorrect(optId: string) {
    if (!draft) return;
    const two = isCheckboxTwo(draft.type);
    setDraft({
      ...draft,
      options: draft.options.map((o) => {
        if (two) {
          if (o.id !== optId) return o;
          return { ...o, correct: !o.correct };
        }
        return { ...o, correct: o.id === optId };
      }),
    });
  }

  async function handleSaveAll() {
    const key = audioKey.trim() || expectedKey;
    let inR2 = audioInR2 === true;
    if (key && !inR2) {
      inR2 = await refreshAudioStatus(key);
    }
    if (!key || !inR2) {
      setError("Upload listening audio to R2 before saving.");
      return;
    }
    if (questions.length === 0) {
      setError("Add at least one question.");
      return;
    }
    const incomplete = questions.findIndex((q) => {
      if (!hasRichTextContent(q.text)) return true;
      if (isOptionType(q.type)) {
        const n = q.options?.filter((o) => o.correct).length ?? 0;
        return isCheckboxTwo(q.type) ? n !== 2 : n !== 1;
      }
      if (isTextType(q.type)) return !q.answer.trim();
      return false;
    });
    if (incomplete >= 0) {
      setError(`Question ${incomplete + 1} is incomplete.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      const res =
        source.kind === "mock"
          ? await adminApi.saveListeningPart(source.mockId, part, {
              audio_key: key,
              questions: questions.map(questionToPayload),
            })
          : await adminApi.saveBankListeningPart(source.setId, part, {
              audio_key: key,
              questions: questions.map(questionToPayload),
            });
      setSaveMsg(`Saved ${res.questions_written} questions.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function correctSummary(q: LocalQuestion): string {
    if (isOptionType(q.type) && q.options) {
      const labels = q.options
        .filter((o) => o.correct)
        .map((o) => `${o.letter}. ${o.text || "(untitled)"}`);
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
        Loading listening part…
      </div>
    );
  }

  const eyebrow = mockTitle
    ? `${mockTitle} · Listening`
    : `Part ${part} · Listening`;

  const previewAudioSrc = localPreviewUrl || undefined;

  if (previewMode) {
    return (
      <div className="pb-24">
        <AdminPageHeader
          eyebrow={eyebrow}
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
        {partCount > 1 ? (
          <PartTabs source={source} part={part} partCount={partCount} />
        ) : null}
        <div className={cn(adminCard, "mt-6")}>
          <span className="mb-4 inline-block rounded-full bg-[#EEF1F5] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-[#64748B]">
            Student preview
          </span>
          {previewAudioSrc || audioKey ? (
            <audio
              controls
              className="mb-6 w-full max-w-md"
              src={previewAudioSrc}
            >
              <track kind="captions" />
            </audio>
          ) : (
            <p className="mb-6 text-sm text-[#94A3B8]">No audio attached yet.</p>
          )}
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
              <div className="mb-3 text-[15px] font-normal text-navy">
                {q.text ? (
                  <AdminRichTextPreview value={q.text} className="border-0 bg-transparent p-0" />
                ) : (
                  "(no question text)"
                )}
              </div>
              {isOptionType(q.type) && q.options && (
                <div className="flex flex-col gap-2">
                  {q.options.map((o) => (
                    <label
                      key={o.id}
                      className="flex items-center gap-2.5 text-sm text-[#28374E]"
                    >
                      <input
                        type={isCheckboxTwo(q.type) ? "checkbox" : "radio"}
                        disabled
                        className="size-4 accent-cyan"
                      />
                      {o.letter}. {o.text}
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
          source={source}
          activeModule="listening"
          label={`${questions.length} ${questions.length === 1 ? "question" : "questions"} added`}
          previewMode
          onTogglePreview={() => setPreviewMode(false)}
          onSave={handleSaveAll}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <AdminPageHeader
        eyebrow={eyebrow}
        title="Listening builder"
        actions={
          <Link
            href={builderBackHref(source)}
            className={cn("text-sm", adminLink)}
          >
            ← Back
          </Link>
        }
      />

      {partCount > 1 ? (
        <PartTabs source={source} part={part} partCount={partCount} />
      ) : null}

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

      {/* Media: 50/50 audio (part) + locked set Watch video */}
      <div
        className={cn(
          adminCard,
          "mt-6 grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-[#EAEEF3]",
        )}
      >
        <div className="lg:pr-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className={adminMutedLabel}>Part audio</p>
              <h2 className={cn(adminHeading, "mt-1 text-[17px]")}>
                Audio · Part {part}
              </h2>
            </div>
            <span className="font-mono text-xs text-[#94A3B8]">
              {audioInR2 === true
                ? "R2 ready"
                : audioInR2 === false
                  ? "Not in R2"
                  : "—"}
            </span>
          </div>

          <audio
            ref={audioRef}
            src={previewAudioSrc}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          >
            <track kind="captions" />
          </audio>

          <div
            className={cn(
              "rounded-xl border border-dashed p-3 transition-colors",
              dragOverAudio ? "border-cyan bg-[#F2FBFD]" : "border-[#E4E9F0] bg-[#FBFCFE]",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              if (!uploading) setDragOverAudio(true);
            }}
            onDragLeave={() => setDragOverAudio(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverAudio(false);
              if (uploading) return;
              const file = e.dataTransfer.files?.[0] ?? null;
              if (file) onFileChosen(file);
            }}
          >
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,.mp3,audio/*"
              className="hidden"
              onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(adminBtnSecondary, "gap-2")}
            >
              <Upload className="size-4" />
              Choose MP3
            </button>
            <button
              type="button"
              disabled={!previewAudioSrc}
              onClick={togglePlay}
              className={cn(adminBtnSecondary, "gap-2")}
            >
              {isPlaying ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              disabled={uploading || !pendingFile}
              onClick={() => void uploadAudio()}
              className={adminBtnPrimary}
            >
              {uploading ? "Uploading…" : "Upload to R2"}
            </button>
            <button
              type="button"
              onClick={() => void refreshAudioStatus()}
              className={adminBtnSecondary}
            >
              Check R2
            </button>
          </div>
          <p className={cn(adminMeta, "mt-2")}>Drop an MP3 here or click Choose MP3.</p>
          </div>
          <p className={cn(adminMeta, "mt-3")}>
            {audioName || "No file selected"}
            {audioKey ? ` · ${audioKey}` : ` · expected ${expectedKey}`}
          </p>
        </div>

        <div className="lg:pl-6">
          {isBank ? (
            <AdminSetWatchVideoCard setId={source.setId} embedded />
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className={adminMutedLabel}>Set Watch video</p>
                  <h2 className={cn(adminHeading, "mt-1 text-[17px]")}>
                    Locked Stream explainer
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#94A3B8]">
                  Bank sets only
                </span>
              </div>
              <p className={cn(adminSubtext, "mt-2")}>
                Open this listening part from a question-bank set to attach a
                signed Stream Watch video for that set.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Question type selector */}
      <div className={cn(adminCard, "mt-5")}>
        <h2 className={cn(adminHeading, "mb-4 text-[17px]")}>Add a question</h2>
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

      {matchingDraft ? (
        <AdminMatchingGroupEditor
          draft={matchingDraft}
          editing={matchingRange != null}
          onChange={setMatchingDraft}
          onSave={saveMatchingGroup}
          onCancel={cancelDraft}
        />
      ) : null}

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
          <div className="mb-5">
            <AdminInlineRichTextEditor
              placeholder="Enter the question or blank sentence…"
              value={draft.text}
              onChange={(next) => setDraft({ ...draft, text: next })}
              rows={2}
            />
          </div>

          {isOptionType(draft.type) && !isListeningMatchingType(draft.type) && (
            <>
              <div className="mb-2.5 flex items-center justify-between">
                <span className={adminMutedLabel}>
                  Options —{" "}
                  {isCheckboxTwo(draft.type)
                    ? "check exactly two"
                    : "select the correct one"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      options: [
                        ...draft.options,
                        {
                          id: `no-${Date.now()}`,
                          letter: optionLetter(draft.options.length),
                          text: "",
                          correct: false,
                        },
                      ],
                    })
                  }
                  className="text-xs font-semibold text-teal hover:text-cyan"
                >
                  + Add option
                </button>
              </div>
              <div className="mb-5 flex flex-col gap-2.5">
                {draft.options.map((o) => (
                  <div key={o.id} className="flex items-center gap-2.5">
                    <input
                      type={isCheckboxTwo(draft.type) ? "checkbox" : "radio"}
                      name="draft-correct"
                      checked={o.correct}
                      onChange={() => toggleCorrect(o.id)}
                      className="size-[17px] accent-cyan"
                    />
                    <span className="w-6 shrink-0 font-mono text-sm font-bold text-teal">
                      {o.letter}.
                    </span>
                    <input
                      type="text"
                      placeholder="Option text…"
                      value={o.text}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          options: draft.options.map((x) =>
                            x.id === o.id ? { ...x, text: e.target.value } : x,
                          ),
                        })
                      }
                      className={cn(adminInput, "mt-0 flex-1")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          options: draft.options
                            .filter((x) => x.id !== o.id)
                            .map((x, i) => ({ ...x, letter: optionLetter(i) })),
                        })
                      }
                      className="px-1 text-red-500 hover:text-red-700"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

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
                  onClick={() =>
                    setDraft({
                      ...draft,
                      altAnswers: [
                        ...draft.altAnswers,
                        { id: `alt-${Date.now()}`, value: "" },
                      ],
                    })
                  }
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
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          altAnswers: draft.altAnswers.map((x) =>
                            x.id === a.id ? { ...x, value: e.target.value } : x,
                          ),
                        })
                      }
                      className={cn(adminInput, "mt-0 flex-1")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          altAnswers: draft.altAnswers.filter(
                            (x) => x.id !== a.id,
                          ),
                        })
                      }
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
            <button type="button" onClick={saveDraft} className={adminBtnPrimary}>
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
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropReorder(i)}
              className="rounded-[13px] border border-[#EAEEF3] transition-colors hover:border-[#D5DCE6]"
            >
              <div
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [q.localId]: !prev[q.localId],
                  }))
                }
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 text-[#B7C1CF]">
                    <GripVertical className="size-4" />
                  </span>
                  <span className="shrink-0 rounded-[7px] bg-cyan-soft px-2 py-1 font-mono text-xs font-semibold text-teal">
                    Q{i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">
                      {q.type}
                    </p>
                    <p className="truncate text-sm font-normal text-navy">
                      {richHtmlToPlainText(q.text) || "(no question text)"}
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
                      setQuestions((prev) =>
                        prev.filter((x) => x.localId !== q.localId),
                      );
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
                  <div className="mb-2 text-sm font-normal text-[#28374E]">
                    {q.text ? (
                      <AdminRichTextPreview value={q.text} className="border-0 bg-transparent p-0" />
                    ) : (
                      "(no question text)"
                    )}
                  </div>
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
        source={source}
        activeModule="listening"
        label={`${questions.length} ${questions.length === 1 ? "question" : "questions"} added`}
        previewMode={false}
        onTogglePreview={() => setPreviewMode(true)}
        onSave={handleSaveAll}
        saving={saving}
      />
    </div>
  );
}

function PartTabs({
  source,
  part,
  partCount,
}: {
  source: BuilderSource;
  part: number;
  partCount: number;
}) {
  const count = Math.max(1, Math.min(4, partCount || 1));
  if (count <= 1) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className={adminMutedLabel}>Parts</span>
      {Array.from({ length: count }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={builderPartHref(source, "listening", p)}
          className={cn(
            "rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-all",
            p === part
              ? "border-cyan bg-cyan-soft/60 text-teal"
              : "border-[#E4E9F0] bg-white text-[#5A6B82] hover:border-cyan",
          )}
        >
          Part {p}
        </Link>
      ))}
    </div>
  );
}
