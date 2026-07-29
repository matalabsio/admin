"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminLink,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { adminApi, defaultListeningAudioKey } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type Props = { mockId: string };

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IngestForm({ mockId }: Props) {
  const searchParams = useSearchParams();
  const initialModule = searchParams.get("module") === "listening" ? "listening" : "reading";
  const initialPart = Number(searchParams.get("part") || "1");

  const [module, setModule] = useState<"reading" | "listening">(initialModule);
  const [part, setPart] = useState(initialPart);
  const [jsonText, setJsonText] = useState("");
  const [audioKey, setAudioKey] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [audioInR2, setAudioInR2] = useState<boolean | null>(null);
  const [audioPlayable, setAudioPlayable] = useState<boolean | null>(null);
  const [audioSizeBytes, setAudioSizeBytes] = useState<number | null>(null);
  const [preview, setPreview] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expectedAudioKey = defaultListeningAudioKey(mockId, part);
  const ingestAudioKey = audioKey.trim() || expectedAudioKey;

  const refreshAudioStatus = useCallback(async () => {
    if (module !== "listening") return;
    try {
      const res = await adminApi.checkListeningAudio(mockId, part, ingestAudioKey);
      setAudioInR2(res.exists_in_r2);
      setAudioPlayable(res.playable ?? res.exists_in_r2);
      setAudioSizeBytes(res.size_bytes ?? null);
    } catch {
      setAudioInR2(null);
      setAudioPlayable(null);
      setAudioSizeBytes(null);
    }
  }, [ingestAudioKey, mockId, module, part]);

  useEffect(() => {
    if (module !== "listening") return;
    setAudioUploaded(false);
    setAudioFile(null);
    setAudioInR2(null);
    setAudioPlayable(null);
    setAudioSizeBytes(null);
    setAudioKey("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [mockId, module, part]);

  useEffect(() => {
    if (module !== "listening") return;
    const timer = setTimeout(() => {
      void refreshAudioStatus();
    }, 200);
    return () => clearTimeout(timer);
  }, [module, refreshAudioStatus]);

  const parseJson = () => {
    try {
      return JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      throw new Error("Invalid JSON");
    }
  };

  const uploadAudio = async () => {
    if (!audioFile) {
      setError("Choose an MP3 file first.");
      return;
    }
    if (audioFile.size > 45 * 1024 * 1024) {
      setError("File is larger than 45 MB. Compress the MP3 or split the part audio.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminApi.uploadListeningAudio(mockId, part, audioFile);
      setAudioKey(res.audio_key);
      setAudioUploaded(true);
      setAudioInR2(true);
      setAudioPlayable(true);
      setAudioSizeBytes(audioFile.size);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Audio upload failed. Restart the dev server after config changes, then try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const validate = async () => {
    if (module === "listening" && audioPlayable !== true) {
      setError("Upload the MP3 to R2 (or use Check R2) before validating listening content.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = parseJson();
      const res = await adminApi.validateIngest(mockId, {
        module,
        part,
        data,
        audio_key: module === "listening" ? ingestAudioKey : undefined,
      });
      setPreview(res);
      if (module === "listening") {
        setAudioInR2(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (module === "listening" && audioPlayable !== true) {
      setError("Upload the MP3 to R2 (or use Check R2) before publishing listening questions.");
      return;
    }
    if (!confirm("Publish this content slice to the database?")) return;
    setBusy(true);
    setError(null);
    try {
      const data = parseJson();
      const res = await adminApi.publishIngest(mockId, {
        module,
        part,
        data,
        audio_key: module === "listening" ? ingestAudioKey : undefined,
      });
      setPreview(res);
      alert(`Published ${(res as { questions_written: number }).questions_written} questions.`);
      if (module === "listening") {
        setAudioInR2(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  };

  const listeningReady = module !== "listening" || audioPlayable === true;
  const checks = [
    { label: "Valid JSON parsed", ok: Boolean(jsonText.trim()) },
    { label: "Part selected", ok: part > 0 },
    { label: "Listening audio ready", ok: listeningReady },
    { label: "Preview generated", ok: Boolean(preview) },
  ];

  return (
    <div className="space-y-6">
      <div className={cn(adminCard, "space-y-4")}>
        <p className={adminMutedLabel}>Step 1 · Choose section</p>
        <h2 className={cn(adminHeading, "text-xl")}>Content ingest</h2>
        <p className={adminSubtext}>Pick the module and section you want to ingest.</p>
        <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium text-black">
          Module
          <select
            value={module}
            onChange={(e) => setModule(e.target.value as "reading" | "listening")}
            className="rounded-lg border border-border bg-white px-2 py-1 text-ink"
          >
            <option value="reading">Reading</option>
            <option value="listening">Listening</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-black">
          Part
          <input
            type="number"
            min={1}
            max={4}
            value={part}
            onChange={(e) => setPart(Number(e.target.value))}
            className="w-16 rounded-lg border border-border bg-white px-2 py-1 text-ink"
          />
        </label>
        </div>
      </div>

      {module === "listening" ? (
        <div className={cn(adminCard, "space-y-3")}>
          <p className={adminMutedLabel}>Step 2 · Upload audio</p>
          <p className="text-sm font-semibold text-black">Listening audio (R2)</p>
          <p className={adminSubtext}>
            Step 1: choose the part MP3. Step 2: click Upload to R2. The same key is written to
            every question in this part when you publish.
          </p>

          <label className="block text-sm font-medium text-black">
            MP3 file
            <div className="mt-2 rounded-xl border border-dashed border-[#CDE3EA] bg-[#F8FCFD] p-4">
              <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,.mp3,audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setAudioFile(file);
                setAudioUploaded(false);
              }}
                className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-teal"
              />
              <p className="mt-2 text-xs text-[#94A3B8]">
                Drag and drop is supported by your browser file picker.
              </p>
            </div>
          </label>
          {audioFile ? (
            <p className="mt-1 text-xs text-gray-600">
              Selected: {audioFile.name} ({formatFileSize(audioFile.size)})
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-700">No file chosen yet.</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || !audioFile}
              onClick={() => void uploadAudio()}
              className={adminBtnSecondary}
            >
              Upload to R2
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refreshAudioStatus()}
              className={adminBtnSecondary}
            >
              Check R2
            </button>
            {audioUploaded ? (
              <span className={adminLink}>Uploaded — key set below</span>
            ) : null}
            {audioPlayable === true ? (
              <span className="text-xs font-semibold text-emerald-700">
                Audio found in R2
                {audioSizeBytes ? ` (${formatFileSize(audioSizeBytes)})` : ""}
              </span>
            ) : audioInR2 === true ? (
              <span className="text-xs font-semibold text-amber-700">
                File exists but looks too small or invalid — re-upload the MP3
              </span>
            ) : audioInR2 === false ? (
              <span className="text-xs font-semibold text-amber-700">Not in R2 yet</span>
            ) : null}
          </div>

          <label className="mt-3 block text-sm font-medium text-black">
            Audio R2 key
            <input
              type="text"
              value={audioKey}
              onChange={(e) => {
                setAudioKey(e.target.value);
                setAudioUploaded(false);
                setAudioInR2(null);
    setAudioPlayable(null);
    setAudioSizeBytes(null);
              }}
              placeholder={expectedAudioKey}
              className={`${adminInput} font-mono text-sm`}
            />
          </label>
          <p className="mt-1 text-xs text-gray-600">
            Expected key after upload: <span className="font-mono">{expectedAudioKey}</span>
          </p>
        </div>
      ) : null}

      <label className={cn(adminCard, "block text-sm font-medium text-black")}>
        <span className={adminMutedLabel}>Step 3 · Paste interface JSON</span>
        <p className="mt-2 text-sm font-semibold text-navy">Interface JSON</p>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={12}
          className={`${adminInput} font-mono text-sm`}
          placeholder="Paste BandForge_*_Interface_Data.json content"
        />
      </label>

      <div className={cn(adminCard, "space-y-3")}>
        <p className={adminMutedLabel}>Step 4 · Validate and publish</p>
        <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !jsonText || !listeningReady}
          onClick={() => void validate()}
          className={adminBtnSecondary}
        >
          Validate & preview
        </button>
        <button
          type="button"
          disabled={busy || !jsonText || !listeningReady}
          onClick={() => void publish()}
          className={adminBtnPrimary}
        >
          Publish
        </button>
        </div>
        <ul className="space-y-2 text-sm">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  check.ok ? "bg-[#15935B]" : "bg-[#B7791F]",
                )}
              />
              <span className={check.ok ? "text-navy" : "text-[#5A6B82]"}>{check.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {module === "listening" && !listeningReady ? (
        <p className="text-sm text-amber-700">
          Upload the MP3 to R2 (or verify an existing key with Check R2) before validating or
          publishing listening content.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {preview ? (
        <pre className="overflow-x-auto rounded-lg border border-border bg-cyan-soft/40 p-4 text-xs text-ink/80">
          {JSON.stringify(preview, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

export function AdminMockIngestClient({ mockId }: Props) {
  return (
    <Suspense fallback={<p className="text-gray-600">Loading…</p>}>
      <IngestForm mockId={mockId} />
    </Suspense>
  );
}
