"use client";

import { useState } from "react";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminFilterPill,
  adminFilterPillActive,
  adminHeading,
  adminInput,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { adminApi } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const SKILLS = [
  { value: "listening", label: "Listening", parts: "4 parts" },
  { value: "reading", label: "Reading", parts: "4 passages" },
  { value: "writing", label: "Writing", parts: "2 tasks" },
  { value: "speaking", label: "Speaking", parts: "3 parts" },
] as const;

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

type Skill = (typeof SKILLS)[number]["value"];
type Difficulty = (typeof DIFFICULTIES)[number]["value"];

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

function showsDifficulty(_skill: Skill): boolean {
  return true;
}

export function AdminCreateQuestionBankSetForm({
  initialSkill,
  onCreated,
  onCancel,
}: Props) {
  const [skill, setSkill] = useState<Skill>(normalizeSkill(initialSkill));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const skillMeta = SKILLS.find((s) => s.value === skill) ?? SKILLS[0];
  const difficultyVisible = showsDifficulty(skill);

  const selectSkill = (next: Skill) => {
    setSkill(next);
    if (!showsDifficulty(next)) {
      setDifficulty("medium");
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      setError("Name is required.");
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
        difficulty: difficultyVisible ? difficulty : "medium",
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
        <h2 className={cn(adminHeading, "mt-1 text-xl")}>
          Create section-wise questions
        </h2>
        <p className={cn(adminSubtext, "mt-1.5")}>
          Pick one skill, name the set, then build each part in the same full
          builder used for mocks (question types, audio, prompts). Content is
          served to students through personalized plan hubs.
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
                onClick={() => selectSkill(s.value)}
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
                  {s.parts} · full builder
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="qb-set-title" className={adminMutedLabel}>
            Set name
          </label>
          <input
            id="qb-set-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g. ${skillMeta.label} — form filling drills`}
            className={adminInput}
            autoFocus
          />
        </div>

        {difficultyVisible ? (
          <fieldset>
            <legend className={adminMutedLabel}>Difficulty</legend>
            <p className={cn(adminSubtext, "mt-1 mb-2 text-[12.5px]")}>
              Used when ordering personalized-plan hubs (easy → medium → hard).
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Difficulty"
            >
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.value;
                return (
                  <label
                    key={d.value}
                    className={cn(
                      adminFilterPill,
                      "cursor-pointer gap-2",
                      active && adminFilterPillActive,
                    )}
                  >
                    <input
                      type="radio"
                      name="qb-set-difficulty"
                      value={d.value}
                      checked={active}
                      onChange={() => setDifficulty(d.value)}
                      className="size-3.5 accent-navy"
                    />
                    {d.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <div>
          <label htmlFor="qb-set-description" className={adminMutedLabel}>
            Description{" "}
            <span className="normal-case tracking-normal text-[#B0BCCB]">
              (optional)
            </span>
          </label>
          <textarea
            id="qb-set-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Who this set is for, weakness tags, notes…"
            className={cn(adminInput, "resize-y")}
          />
        </div>

        <div>
          <p className={adminMutedLabel}>Status</p>
          <p className={cn(adminSubtext, "mt-1 text-[12.5px]")}>
            New sets start as <span className="font-semibold text-navy">draft</span>.
            Add content, then publish from the set list.
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
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
          {busy
            ? "Creating…"
            : `Create ${skillMeta.label} set & open Part 1`}
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
