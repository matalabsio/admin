"use client";

import { useState } from "react";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { adminApi } from "@/lib/admin-api";
import {
  EXAM_MODULE_LABELS,
  WRITING_EXAM_MODULES,
  type WritingExamModule,
} from "@/lib/writing-taxonomy";
import { cn } from "@/lib/utils";

const SKILLS = [
  { value: "listening", label: "Listening", hint: "Name · video · audio · questions" },
  { value: "reading", label: "Reading", hint: "Name · passage · questions" },
  { value: "writing", label: "Writing", hint: "Name · exam module · prompt" },
  { value: "speaking", label: "Speaking", hint: "Name · prompts · clips" },
] as const;

type Skill = (typeof SKILLS)[number]["value"];

type Props = {
  initialSkill: string;
  onCreated: (set: { set_id: string; skill: string }) => void;
  onCancel: () => void;
};

function normalizeSkill(raw: string): Skill {
  const s = raw.toLowerCase();
  if (s === "reading" || s === "writing" || s === "speaking") return s;
  return "listening";
}

export function AdminCreateQuestionBankSetForm({
  initialSkill,
  onCreated,
  onCancel,
}: Props) {
  const [skill, setSkill] = useState<Skill>(normalizeSkill(initialSkill));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Explicit selection required for Writing — no silent academic default.
  const [examModule, setExamModule] = useState<WritingExamModule | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const skillMeta = SKILLS.find((s) => s.value === skill) ?? SKILLS[0];

  const submit = async () => {
    if (!title.trim()) {
      setError("Name is required.");
      return;
    }
    if (skill === "writing" && !examModule) {
      setError("Select an Exam Module (Academic, General Training, or Both).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await adminApi.createQuestionBankSet({
        skill,
        title: title.trim(),
        description: description.trim() || undefined,
        status: "draft",
        difficulty: "medium",
        ...(skill === "writing" && examModule
          ? { exam_module: examModule }
          : {}),
      });
      onCreated({ set_id: String(created.set_id), skill: created.skill });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create practice set");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(adminCard, "space-y-6")}>
      <div>
        <p className={adminMutedLabel}>New practice set</p>
        <h2 className={cn(adminHeading, "mt-1 text-xl")}>Create one set</h2>
        <p className={cn(adminSubtext, "mt-1.5")}>
          Each set is a single named unit. Add content in the builder when you
          want — Listening includes Watch video and part audio for that set.
        </p>
      </div>

      <div>
        <p className={cn(adminMutedLabel, "mb-2")}>Skill</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map((s) => {
            const active = s.value === skill;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  setSkill(s.value);
                  if (s.value !== "writing") setExamModule("");
                }}
                className={cn(
                  "cursor-pointer rounded-[12px] border px-3 py-3 text-left transition-colors",
                  active
                    ? "border-cyan bg-cyan-soft/40 ring-2 ring-cyan/25"
                    : "border-[#E4E9F0] bg-white hover:border-cyan/40",
                )}
                aria-pressed={active}
              >
                <span className="block text-sm font-semibold text-navy">
                  {s.label}
                </span>
                <span className="mt-0.5 block text-[12px] text-[#94A3B8]">
                  {s.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {skill === "writing" ? (
        <fieldset>
          <legend className={cn(adminMutedLabel, "mb-2")}>Exam Module</legend>
          <p className={cn(adminSubtext, "mb-3")}>
            Required. Both means this set is valid for Academic and General
            Training — content is not duplicated.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {WRITING_EXAM_MODULES.map((mod) => {
              const active = examModule === mod;
              return (
                <label
                  key={mod}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[12px] border px-4 py-3 text-sm font-semibold transition-colors",
                    active
                      ? "border-cyan bg-cyan-soft/40 text-navy ring-2 ring-cyan/25"
                      : "border-[#E4E9F0] bg-white text-[#5A6B82] hover:border-cyan/40",
                  )}
                >
                  <input
                    type="radio"
                    name="exam_module"
                    value={mod}
                    checked={active}
                    onChange={() => setExamModule(mod)}
                    className="accent-cyan"
                  />
                  {EXAM_MODULE_LABELS[mod]}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="space-y-4">
        <div>
          <label htmlFor="qb-set-title" className={adminMutedLabel}>
            Set name
          </label>
          <input
            id="qb-set-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g. ${skillMeta.label} — form filling drill`}
            className={adminInput}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="qb-set-description" className={adminMutedLabel}>
            Description{" "}
            <span className="normal-case tracking-normal text-[#94A3B8]">
              (optional)
            </span>
          </label>
          <textarea
            id="qb-set-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Short note for admins — not shown to students."
            className={cn(adminInput, "min-h-[88px] resize-y py-2")}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={adminBtnPrimary}
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? "Creating…" : "Create set"}
        </button>
        <button
          type="button"
          className={adminBtnSecondary}
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
