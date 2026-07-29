"use client";

import { useState } from "react";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { adminApi } from "@/lib/admin-api";

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
      });
      onCreated({ id: String(mock.id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create mock");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={adminCard}>
      <h2 className={adminHeading}>New full mock test</h2>
      <p className={adminSubtext}>
        Creates a draft test with the same structure as Test 1 and Test 2 (Listening → Reading →
        Writing). Assigns the next catalog slot automatically.
      </p>

      <label className="mt-4 block text-sm font-medium text-black">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="IELTS Academic Mock 3"
          className={adminInput}
        />
      </label>

      <label className="mt-3 block text-sm font-medium text-black">
        Description (optional)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={adminInput}
        />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-black">
          Listening parts
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
          Reading passages
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
          Writing tasks
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

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className={adminBtnPrimary}
        >
          {busy ? "Creating…" : "Create mock"}
        </button>
        <button type="button" onClick={onCancel} className={adminBtnSecondary}>
          Cancel
        </button>
      </div>
    </div>
  );
}
