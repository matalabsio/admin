"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  adminApi,
  defaultBankListeningAudioKey,
  type ListeningBuilderQuestionIn,
  type ReadingBuilderQuestionIn,
} from "@/lib/admin-api";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

const adminTextarea = cn(adminInput, "min-h-[88px] resize-y py-2");

const PART_COUNTS: Record<string, number> = {
  listening: 4,
  reading: 4,
  writing: 2,
  speaking: 3,
};

type Props = {
  skill: string;
  setId: string;
  part: number;
};

export function AdminBankBuilderClient({ skill, setId, part }: Props) {
  const partCount = PART_COUNTS[skill] ?? 4;
  const safePart = Math.min(Math.max(part, 1), partCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Listening
  const [audioKey, setAudioKey] = useState(defaultBankListeningAudioKey(setId, safePart));
  const [instructions, setInstructions] = useState("");
  const [listeningQs, setListeningQs] = useState<ListeningBuilderQuestionIn[]>([
    {
      question_type: "Note completion",
      prompt: "",
      correct_answer: "",
      alt_answers: [],
    },
  ]);

  // Reading
  const [passage, setPassage] = useState("");
  const [readingQs, setReadingQs] = useState<ReadingBuilderQuestionIn[]>([
    {
      question_type: "True / False / Not Given",
      prompt: "",
      correct_answer: "",
      alt_answers: [],
    },
  ]);

  // Writing
  const [writingPrompt, setWritingPrompt] = useState("");
  const [writingImage, setWritingImage] = useState("");

  // Speaking
  const [speakingPrompts, setSpeakingPrompts] = useState<
    Array<{ prompt: string; speak_time_sec: number; record_sec: number }>
  >([{ prompt: "", speak_time_sec: 15, record_sec: 45 }]);

  const load = useCallback(async () => {
    setError(null);
    setOkMsg(null);
    try {
      if (skill === "listening") {
        const res = await adminApi.loadBankListeningPart(setId, safePart);
        setAudioKey(res.audio_key || defaultBankListeningAudioKey(setId, safePart));
        setInstructions(res.instructions || "");
        setListeningQs(
          res.questions.length
            ? res.questions.map((q) => ({
                question_type: q.question_type,
                prompt: q.prompt,
                options: q.options,
                correct_answer: q.correct_answer,
                alt_answers: q.alt_answers,
                skill_tag: q.skill_tag,
                instructions: q.instructions,
                choose_two: q.choose_two,
              }))
            : [
                {
                  question_type: "Note completion",
                  prompt: "",
                  correct_answer: "",
                  alt_answers: [],
                },
              ],
        );
      } else if (skill === "reading") {
        const res = await adminApi.loadBankReadingPart(setId, safePart);
        setPassage(res.passage_text || "");
        setReadingQs(
          res.questions.length
            ? res.questions.map((q) => ({
                question_type: q.question_type,
                prompt: q.prompt,
                options: q.options,
                correct_answer: q.correct_answer,
                alt_answers: q.alt_answers,
                skill_tag: q.skill_tag,
              }))
            : [
                {
                  question_type: "True / False / Not Given",
                  prompt: "",
                  correct_answer: "",
                  alt_answers: [],
                },
              ],
        );
      } else if (skill === "writing") {
        const res = await adminApi.loadBankWritingPart(setId, safePart);
        setWritingPrompt(res.prompt || "");
        setWritingImage(res.image_url || "");
      } else {
        const res = await adminApi.loadBankSpeakingPart(setId, safePart);
        setSpeakingPrompts(
          res.questions.length
            ? res.questions.map((q) => ({
                prompt: q.prompt,
                speak_time_sec: q.speak_time_sec,
                record_sec: q.record_sec,
              }))
            : [{ prompt: "", speak_time_sec: 15, record_sec: 45 }],
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load section");
    }
  }, [skill, setId, safePart]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      if (skill === "listening") {
        const cleaned = listeningQs.filter((q) => q.prompt.trim());
        if (!cleaned.length) throw new Error("Add at least one question with a prompt.");
        if (!audioKey.trim()) throw new Error("Audio key is required.");
        const res = await adminApi.saveBankListeningPart(setId, safePart, {
          audio_key: audioKey.trim(),
          instructions: instructions.trim() || null,
          questions: cleaned,
        });
        setOkMsg(`Saved ${res.questions_written} listening questions.`);
      } else if (skill === "reading") {
        const cleaned = readingQs.filter((q) => q.prompt.trim());
        if (!passage.trim()) throw new Error("Passage text is required.");
        if (!cleaned.length) throw new Error("Add at least one question.");
        const res = await adminApi.saveBankReadingPart(setId, safePart, {
          passage_text: passage.trim(),
          questions: cleaned,
        });
        setOkMsg(`Saved ${res.questions_written} reading questions.`);
      } else if (skill === "writing") {
        if (!writingPrompt.trim()) throw new Error("Writing prompt is required.");
        await adminApi.saveBankWritingPart(setId, safePart, {
          prompt: writingPrompt.trim(),
          image_url: writingImage.trim() || null,
        });
        setOkMsg("Writing task saved.");
      } else {
        const cleaned = speakingPrompts.filter((q) => q.prompt.trim());
        if (!cleaned.length) throw new Error("Add at least one speaking prompt.");
        const res = await adminApi.saveBankSpeakingPart(setId, safePart, {
          questions: cleaned,
        });
        setOkMsg(`Saved ${res.questions_written} speaking prompts.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${skill[0]!.toUpperCase()}${skill.slice(1)} · Part ${safePart}`}
        subtitle="Question bank builder — content feeds practice hub Submit on the personalized plan."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/question-bank" className={adminBtnSecondary}>
          All sets
        </Link>
        {Array.from({ length: partCount }, (_, i) => i + 1).map((p) => (
          <Link
            key={p}
            href={`/admin/question-bank/${skill}/${setId}/${p}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium",
              p === safePart
                ? "border-navy bg-navy text-white"
                : "border-border-soft bg-white text-ink/70 hover:bg-ink/[0.03]",
            )}
          >
            Part {p}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {okMsg ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {okMsg}
        </p>
      ) : null}

      <div className={cn(adminCard, "space-y-4")}>
        {skill === "listening" ? (
          <>
            <div>
              <label className={adminMutedLabel}>Audio key (R2)</label>
              <input
                className={adminInput}
                value={audioKey}
                onChange={(e) => setAudioKey(e.target.value)}
              />
              <p className={cn(adminSubtext, "mt-1")}>
                Upload via API or paste an existing key. Default:{" "}
                {defaultBankListeningAudioKey(setId, safePart)}
              </p>
            </div>
            <div>
              <label className={adminMutedLabel}>Instructions</label>
              <textarea
                className={adminTextarea}
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
            <h3 className={cn(adminHeading, "text-base")}>Questions</h3>
            {listeningQs.map((q, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-border-soft p-3">
                <input
                  className={adminInput}
                  placeholder="Question type"
                  value={q.question_type}
                  onChange={(e) => {
                    const next = [...listeningQs];
                    next[idx] = { ...q, question_type: e.target.value };
                    setListeningQs(next);
                  }}
                />
                <textarea
                  className={adminTextarea}
                  rows={2}
                  placeholder="Prompt"
                  value={q.prompt}
                  onChange={(e) => {
                    const next = [...listeningQs];
                    next[idx] = { ...q, prompt: e.target.value };
                    setListeningQs(next);
                  }}
                />
                <input
                  className={adminInput}
                  placeholder="Correct answer"
                  value={q.correct_answer}
                  onChange={(e) => {
                    const next = [...listeningQs];
                    next[idx] = { ...q, correct_answer: e.target.value };
                    setListeningQs(next);
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() =>
                setListeningQs((prev) => [
                  ...prev,
                  {
                    question_type: "Note completion",
                    prompt: "",
                    correct_answer: "",
                    alt_answers: [],
                  },
                ])
              }
            >
              Add question
            </button>
          </>
        ) : null}

        {skill === "reading" ? (
          <>
            <div>
              <label className={adminMutedLabel}>Passage</label>
              <textarea
                className={adminTextarea}
                rows={8}
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
              />
            </div>
            <h3 className={cn(adminHeading, "text-base")}>Questions</h3>
            {readingQs.map((q, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-border-soft p-3">
                <input
                  className={adminInput}
                  value={q.question_type}
                  onChange={(e) => {
                    const next = [...readingQs];
                    next[idx] = { ...q, question_type: e.target.value };
                    setReadingQs(next);
                  }}
                />
                <textarea
                  className={adminTextarea}
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => {
                    const next = [...readingQs];
                    next[idx] = { ...q, prompt: e.target.value };
                    setReadingQs(next);
                  }}
                />
                <input
                  className={adminInput}
                  placeholder="Correct answer"
                  value={q.correct_answer}
                  onChange={(e) => {
                    const next = [...readingQs];
                    next[idx] = { ...q, correct_answer: e.target.value };
                    setReadingQs(next);
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() =>
                setReadingQs((prev) => [
                  ...prev,
                  {
                    question_type: "True / False / Not Given",
                    prompt: "",
                    correct_answer: "",
                    alt_answers: [],
                  },
                ])
              }
            >
              Add question
            </button>
          </>
        ) : null}

        {skill === "writing" ? (
          <>
            <div>
              <label className={adminMutedLabel}>Task prompt</label>
              <textarea
                className={adminTextarea}
                rows={6}
                value={writingPrompt}
                onChange={(e) => setWritingPrompt(e.target.value)}
              />
            </div>
            {safePart === 1 ? (
              <div>
                <label className={adminMutedLabel}>Image key (optional)</label>
                <input
                  className={adminInput}
                  value={writingImage}
                  onChange={(e) => setWritingImage(e.target.value)}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {skill === "speaking" ? (
          <>
            {speakingPrompts.map((q, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-border-soft p-3">
                <textarea
                  className={adminTextarea}
                  rows={2}
                  placeholder="Prompt"
                  value={q.prompt}
                  onChange={(e) => {
                    const next = [...speakingPrompts];
                    next[idx] = { ...q, prompt: e.target.value };
                    setSpeakingPrompts(next);
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className={adminInput}
                    type="number"
                    value={q.speak_time_sec}
                    onChange={(e) => {
                      const next = [...speakingPrompts];
                      next[idx] = {
                        ...q,
                        speak_time_sec: Number(e.target.value) || 15,
                      };
                      setSpeakingPrompts(next);
                    }}
                  />
                  <input
                    className={adminInput}
                    type="number"
                    value={q.record_sec}
                    onChange={(e) => {
                      const next = [...speakingPrompts];
                      next[idx] = {
                        ...q,
                        record_sec: Number(e.target.value) || 45,
                      };
                      setSpeakingPrompts(next);
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() =>
                setSpeakingPrompts((prev) => [
                  ...prev,
                  { prompt: "", speak_time_sec: 15, record_sec: 45 },
                ])
              }
            >
              Add prompt
            </button>
          </>
        ) : null}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className={adminBtnPrimary}
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save section"}
          </button>
          <button
            type="button"
            className={adminBtnSecondary}
            disabled={busy}
            onClick={() => void load()}
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
