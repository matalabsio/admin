"use client";

import { useState } from "react";
import { adminApi, type AdminMockListItem } from "@/lib/admin-api";
import {
  adminBtnPrimary,
  adminCard,
  adminHeading,
  adminInput,
  adminMutedLabel,
} from "@/components/admin/admin-ui";
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
  const [writingTasks, setWritingTasks] = useState(mock.configured_writing_tasks ?? 2);
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
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={adminInput} />
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
