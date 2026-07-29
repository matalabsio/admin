"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminLink,
  adminMeta,
  adminMutedLabel,
} from "@/components/admin/admin-ui";
import { adminApi } from "@/lib/admin-api";

type Props = { mockId: string; questionId: string };

type McqOption = { label: string; text: string };

const NEXT_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function parseOptions(raw: unknown): McqOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const label = String(row.label ?? row.letter ?? "").trim();
      const text = String(row.text ?? "").trim();
      if (!label && !text) return null;
      return { label, text };
    })
    .filter((o): o is McqOption => o != null);
}

function nextOptionLabel(existing: McqOption[]): string {
  const used = new Set(existing.map((o) => o.label.toUpperCase()));
  for (const letter of NEXT_LABELS) {
    if (!used.has(letter)) return letter;
  }
  return String(existing.length + 1);
}

export function AdminQuestionEditClient({ mockId, questionId }: Props) {
  const [question, setQuestion] = useState<Record<string, unknown> | null>(null);
  const [prompt, setPrompt] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState<McqOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const questionType = String(question?.question_type ?? "");
  const showOptionsEditor = useMemo(() => {
    if (questionType.toLowerCase() === "mcq") return true;
    return options.length > 0;
  }, [questionType, options.length]);

  const load = useCallback(async () => {
    try {
      const q = await adminApi.getQuestion(questionId);
      setQuestion(q);
      setPrompt(String(q.prompt ?? ""));
      setCorrectAnswer(String(q.correct_answer ?? ""));
      setExplanation(String(q.explanation ?? ""));
      setOptions(parseOptions(q.options));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load question");
    }
  }, [questionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateOption = (index: number, patch: Partial<McqOption>) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)),
    );
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { label: nextOptionLabel(prev), text: "" }]);
  };

  const removeOption = (index: number) => {
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const removedLabel = prev[index]?.label;
      if (removedLabel && correctAnswer === removedLabel) {
        setCorrectAnswer(next[0]?.label ?? "");
      }
      return next;
    });
  };

  const validate = (): string | null => {
    if (!prompt.trim()) return "Prompt is required.";
    if (!showOptionsEditor) return null;

    if (options.length < 2) {
      return "MCQ questions need at least 2 options.";
    }
    for (const opt of options) {
      if (!opt.label.trim()) return "Every option needs a label (A, B, C…).";
      if (!opt.text.trim()) return `Option ${opt.label} needs answer text.`;
    }
    const labels = options.map((o) => o.label.trim());
    if (new Set(labels.map((l) => l.toUpperCase())).size !== labels.length) {
      return "Option labels must be unique.";
    }
    if (!correctAnswer.trim()) {
      return "Select a correct answer.";
    }
    if (!labels.includes(correctAnswer.trim())) {
      return "Correct answer must match one of the option labels.";
    }
    return null;
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setBusy(false);
      return;
    }

    try {
      const payload: {
        prompt: string;
        correct_answer: string;
        explanation?: string;
        options?: McqOption[];
      } = {
        prompt: prompt.trim(),
        correct_answer: correctAnswer.trim(),
        explanation: explanation.trim() || undefined,
      };
      if (showOptionsEditor) {
        payload.options = options.map((o) => ({
          label: o.label.trim(),
          text: o.text.trim(),
        }));
      }

      await adminApi.patchQuestion(questionId, payload);
      await load();
      setSuccess("Saved — version recorded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (!question && !error) return <p className="text-gray-600">Loading…</p>;
  if (error && !question) return <p className="text-red-600">{error}</p>;

  const versions = (question?.versions as unknown[]) ?? [];
  const moduleName = String(question?.module ?? "—");
  const part = question?.part != null ? String(question.part) : "—";
  const questionNumber =
    question?.question_number != null ? String(question.question_number) : "—";

  return (
    <div className="space-y-6">
      <Link href={`/admin/mocks/${mockId}/questions`} className={adminLink}>
        ← Back to question tree
      </Link>

      <p className={adminMeta}>
        {moduleName} · Part {part} · Q{questionNumber} · {questionType || "—"}
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <label className="block text-sm font-medium text-black">
            Prompt
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className={adminInput}
            />
          </label>

          {showOptionsEditor ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className={adminMutedLabel}>Options</p>
                <button
                  type="button"
                  onClick={addOption}
                  className={`${adminBtnSecondary} gap-1.5 px-3 py-1.5 text-xs`}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add option
                </button>
              </div>

              <ul className="space-y-2">
                {options.map((opt, index) => (
                  <li
                    key={`opt-${index}`}
                    className="flex flex-col gap-2 rounded-[11px] border border-[#E4E9F0] bg-[#FBFCFE] p-3 sm:flex-row sm:items-center"
                  >
                    <input
                      value={opt.label}
                      onChange={(e) =>
                        updateOption(index, { label: e.target.value.toUpperCase() })
                      }
                      aria-label={`Option ${index + 1} label`}
                      className={`${adminInput} mt-0 max-w-[4.5rem] text-center font-mono font-semibold`}
                      maxLength={4}
                    />
                    <input
                      value={opt.text}
                      onChange={(e) => updateOption(index, { text: e.target.value })}
                      aria-label={`Option ${opt.label || index + 1} text`}
                      placeholder="Choice text"
                      className={`${adminInput} mt-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      disabled={options.length <= 2}
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[11px] border border-[#E4E9F0] text-[#94A3B8] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                      aria-label={`Remove option ${opt.label || index + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <label className="block text-sm font-medium text-black">
            Correct answer
            {showOptionsEditor && options.length > 0 ? (
              <select
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className={adminInput}
              >
                <option value="">Select label…</option>
                {options.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label}
                    {opt.text ? ` — ${opt.text.slice(0, 60)}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className={adminInput}
              />
            )}
          </label>

          <label className="block text-sm font-medium text-black">
            Explanation
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className={adminInput}
            />
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className={`${adminBtnPrimary} mt-2`}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>

          {error ? (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {success ? (
            <p
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              role="status"
            >
              {success}
            </p>
          ) : null}
        </div>

        <aside className={adminCard}>
          <h2 className={adminHeading}>Version history</h2>
          <ul className={`mt-3 space-y-2 ${adminMeta}`}>
            {versions.length === 0 ? (
              <li>No versions yet</li>
            ) : (
              (versions as Record<string, unknown>[]).map((v) => (
                <li key={String(v.id)}>
                  v{String(v.version)} · {String(v.created_at).slice(0, 10)}
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
