"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
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

type Props = {
  onCreated: (mock: { id: string }) => void;
  onCancel: () => void;
};

export function AdminCreateMockForm({ onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listeningParts, setListeningParts] = useState(4);
  const [readingPassages, setReadingPassages] = useState(3);
  const [writingTasks, setWritingTasks] = useState(2);
  // Optional Writing-track tag — no silent Academic default.
  const [examModule, setExamModule] = useState<WritingExamModule | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const mock = await adminApi.createMock({
        title: title.trim(),
        description: description.trim() || undefined,
        listening_parts: listeningParts,
        reading_passages: readingPassages,
        writing_tasks: writingTasks,
        ...(examModule ? { exam_module: examModule } : {}),
      });
      onCreated({ id: String(mock.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create mock");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn(adminCard, "space-y-6")}>
      <div>
        <p className={adminMutedLabel}>New mock</p>
        <h2 className={cn(adminHeading, "mt-1 text-xl")}>Full mock test</h2>
        <p className={cn(adminSubtext, "mt-1.5")}>
          Draft with Listening → Reading → Writing. Next catalog slot assigned
          automatically. Exam Module tags the Writing track (optional until
          later selection phases).
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="mock-title" className={adminMutedLabel}>
            Title
          </label>
          <input
            id="mock-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="IELTS Academic Mock 3"
            className={adminInput}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="mock-description" className={adminMutedLabel}>
            Description{" "}
            <span className="normal-case tracking-normal text-[#B0BCCB]">
              (optional)
            </span>
          </label>
          <textarea
            id="mock-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Short note for admins…"
            className={cn(adminInput, "resize-y")}
          />
        </div>
      </div>

      <fieldset>
        <legend className={cn(adminMutedLabel, "mb-2")}>
          Exam Module{" "}
          <span className="normal-case tracking-normal text-[#B0BCCB]">
            (Writing track · optional)
          </span>
        </legend>
        <p className={cn(adminSubtext, "mb-3")}>
          Academic / General Training / Both for Writing. Leave unset to keep
          unclassified. Does not change runtime mock access yet.
        </p>
        <div
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          role="radiogroup"
          aria-label="Exam Module"
        >
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
                  name="mock_exam_module"
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

      <div>
        <p className={cn(adminMutedLabel, "mb-3")}>Test structure</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <StructureStepper
            label="Listening"
            unit="parts"
            value={listeningParts}
            min={1}
            max={4}
            onChange={setListeningParts}
          />
          <StructureStepper
            label="Reading"
            unit="passages"
            value={readingPassages}
            min={1}
            max={4}
            onChange={setReadingPassages}
          />
          <StructureStepper
            label="Writing"
            unit="tasks"
            value={writingTasks}
            min={1}
            max={2}
            onChange={setWritingTasks}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#EDF1F6] pt-4">
        <button type="button" onClick={onCancel} className={adminBtnSecondary}>
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className={adminBtnPrimary}
        >
          {busy ? "Creating…" : "Create mock"}
        </button>
      </div>
    </div>
  );
}

function StructureStepper({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className="rounded-[13px] border border-[#EAEEF3] bg-[#FBFCFD] px-4 py-3.5">
      <p className="text-sm font-semibold text-navy">{label}</p>
      <p className={cn(adminMutedLabel, "mt-0.5")}>{unit}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[#CDD7E2] bg-white text-navy transition-colors hover:bg-cyan-soft/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="font-mono text-xl font-semibold tabular-nums text-navy">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[#CDD7E2] bg-white text-navy transition-colors hover:bg-cyan-soft/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
