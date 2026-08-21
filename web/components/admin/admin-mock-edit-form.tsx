"use client";

import { useState } from "react";
import { adminApi, type AdminMockListItem } from "@/lib/admin-api";
import {
  adminBtnPrimary,
  adminCard,
  adminHeading,
  adminInput,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import {
  EXAM_MODULE_LABELS,
  WRITING_EXAM_MODULES,
  isWritingExamModule,
  type WritingExamModule,
} from "@/lib/writing-taxonomy";
import { cn } from "@/lib/utils";

type Props = {
  mock: AdminMockListItem;
  onSaved: () => void;
};

export function AdminMockEditForm({ mock, onSaved }: Props) {
  const [title, setTitle] = useState(mock.title);
  const [description, setDescription] = useState(mock.description ?? "");
  const [catalogNumber, setCatalogNumber] = useState(
    mock.catalog_number != null ? String(mock.catalog_number) : "",
  );
  const [listeningParts, setListeningParts] = useState(
    mock.configured_listening_parts ?? 4,
  );
  const [readingPassages, setReadingPassages] = useState(
    mock.configured_reading_passages ?? 3,
  );
  const [writingTasks, setWritingTasks] = useState(
    mock.configured_writing_tasks ?? 2,
  );
  const [examModule, setExamModule] = useState<WritingExamModule | "">(
    isWritingExamModule(mock.exam_module) ? mock.exam_module : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.patchMock(mock.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        catalog_number: catalogNumber ? Number(catalogNumber) : undefined,
        listening_parts: listeningParts,
        reading_passages: readingPassages,
        writing_tasks: writingTasks,
        exam_module: examModule || null,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={adminCard}>
      <h2 className={cn(adminHeading, "text-xl")}>Edit mock</h2>

      <label className="mt-4 block text-sm font-medium text-black">
        <span className={adminMutedLabel}>Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={adminInput}
        />
      </label>

      <label className="mt-3 block text-sm font-medium text-black">
        <span className={adminMutedLabel}>Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={cn(adminInput, "min-h-20")}
        />
      </label>

      <label className="mt-3 block text-sm font-medium text-black">
        <span className={adminMutedLabel}>Catalog slot (Test number)</span>
        <input
          type="number"
          min={1}
          max={20}
          value={catalogNumber}
          onChange={(e) => setCatalogNumber(e.target.value)}
          placeholder="3"
          className={`${adminInput} w-32`}
        />
      </label>

      <fieldset className="mt-4">
        <legend className={adminMutedLabel}>Exam Module (Writing track)</legend>
        <p className={cn(adminSubtext, "mt-1 mb-3")}>
          Tags Academic / General Training / Both for Writing. Unset =
          unclassified. Runtime access unchanged in this phase.
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
                  name="mock_edit_exam_module"
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

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-black">
          <span className={adminMutedLabel}>Listening parts</span>
          <input
            type="number"
            min={1}
            max={4}
            value={listeningParts}
            onChange={(e) => setListeningParts(Number(e.target.value))}
            className={adminInput}
          />
        </label>
        <label className="text-sm font-medium text-black">
          <span className={adminMutedLabel}>Reading passages</span>
          <input
            type="number"
            min={1}
            max={4}
            value={readingPassages}
            onChange={(e) => setReadingPassages(Number(e.target.value))}
            className={adminInput}
          />
        </label>
        <label className="text-sm font-medium text-black">
          <span className={adminMutedLabel}>Writing tasks</span>
          <input
            type="number"
            min={1}
            max={2}
            value={writingTasks}
            onChange={(e) => setWritingTasks(Number(e.target.value))}
            className={adminInput}
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className={`${adminBtnPrimary} mt-4`}
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
