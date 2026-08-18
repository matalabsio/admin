"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload, Video } from "lucide-react";
import {
  adminApi,
  type StreamVideoItem,
  type StreamVideoTag,
} from "@/lib/admin-api";
import { streamStatusKind, waitForStreamReady } from "@/lib/stream-ready";
import {
  STREAM_DIRECT_MAX_BYTES,
  formatVideoBytes,
  prepareVideoForStreamUpload,
  uploadFileToStreamTus,
} from "@/lib/stream-video-upload";
import { AdminStreamUploadStatus } from "@/components/admin/admin-stream-status";
import { AdminFileDropZone } from "@/components/admin/admin-file-drop-zone";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminMeta,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

const SKILL_DEFAULT_TITLES: Partial<Record<StreamVideoTag, string>> = {
  "listening-intro": "Listening intro",
  "reading-intro": "Reading intro",
  "writing-intro": "Writing intro",
  "speaking-intro": "Speaking intro",
};

type Props = {
  tag: StreamVideoTag;
  title?: string;
  /** Compact card for builders; full form fields when false. */
  compact?: boolean;
  className?: string;
  onUploaded?: (item: StreamVideoItem) => void;
};

export function AdminSkillWatchVideoCard({
  tag,
  title: titleProp,
  compact = false,
  className,
  onUploaded,
}: Props) {
  const defaultTitle = titleProp || SKILL_DEFAULT_TITLES[tag] || tag;
  const [title, setTitle] = useState(defaultTitle);
  const [durationMin, setDurationMin] = useState("12");
  const [file, setFile] = useState<File | null>(null);
  const [uidInput, setUidInput] = useState("");
  const [existing, setExisting] = useState<StreamVideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "processing">(
    "uploading",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadExisting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listStreamVideos();
      const hit = res.items.find((item) => item.tag === tag) ?? null;
      setExisting(hit);
      if (hit?.title) setTitle(hit.title);
      if (hit?.duration_min) setDurationMin(String(hit.duration_min));
    } catch {
      setExisting(null);
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  async function onUpload() {
    if (!file) {
      setError(`Choose an MP4/WebM first (max ${formatVideoBytes(STREAM_DIRECT_MAX_BYTES)}).`);
      return;
    }
    setUploading(true);
    setUploadPhase("uploading");
    setError(null);
    setSuccess(null);
    setProgress(0);
    try {
      const prepared = await prepareVideoForStreamUpload(file);
      setProgress(0);
      const created = await adminApi.createStreamDirectUpload({
        tag,
        title: title.trim() || defaultTitle,
        max_duration_seconds: 3600,
        upload_length: prepared.file.size,
      });
      await uploadFileToStreamTus(prepared.file, created.uploadURL, setProgress);
      setProgress(100);
      setUploadPhase("processing");
      setExisting({
        tag,
        title: title.trim() || defaultTitle,
        stream_uid: created.uid,
        playback_url: "",
        duration_min: 0,
        status: "processing",
      });
      await waitForStreamReady(created.uid, { minMs: 1200, intervalMs: 2000 });
      const minutes = Number.parseInt(durationMin, 10);
      const saved = await adminApi.completeStreamVideo({
        tag,
        title: title.trim() || defaultTitle,
        stream_uid: created.uid,
        duration_min: Number.isFinite(minutes) ? Math.max(0, minutes) : 0,
      });
      const hubs = saved.hubs_updated ?? 0;
      const shrinkNote = prepared.compressed
        ? ` Compressed ${formatVideoBytes(prepared.originalBytes)} → ${formatVideoBytes(prepared.finalBytes)}.`
        : "";
      const ready = streamStatusKind(saved.status) === "ready";
      setSuccess(
        hubs > 0
          ? `Watch video saved${ready ? "" : " · processing on Stream"}.${shrinkNote} Synced to ${hubs} hub${hubs === 1 ? "" : "s"}.`
          : `Watch video saved to Stream library${ready ? "" : " · processing on Stream"}.${shrinkNote}`,
      );
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setProgress(null);
      setUploadPhase("uploading");
      setExisting(saved);
      onUploaded?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
      setUploadPhase("uploading");
    } finally {
      setUploading(false);
    }
  }

  async function onAttach() {
    const uid = uidInput.trim();
    if (!uid) {
      setError("Paste a Stream video UID or iframe URL.");
      return;
    }
    setAttaching(true);
    setError(null);
    setSuccess(null);
    try {
      const minutes = Number.parseInt(durationMin, 10);
      const saved = await adminApi.completeStreamVideo({
        tag,
        title: title.trim() || defaultTitle,
        stream_uid: uid,
        duration_min: Number.isFinite(minutes) ? Math.max(0, minutes) : 0,
      });
      const hubs = saved.hubs_updated ?? 0;
      setSuccess(
        hubs > 0
          ? `Watch video attached. Synced to ${hubs} hub${hubs === 1 ? "" : "s"}.`
          : "Watch video attached to the Stream library.",
      );
      setUidInput("");
      setExisting(saved);
      onUploaded?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach Stream video");
    } finally {
      setAttaching(false);
    }
  }

  const statusKind = streamStatusKind(existing?.status);
  const statusLabel = loading
    ? "Checking…"
    : existing?.playback_url || existing?.stream_uid
      ? statusKind === "ready"
        ? "Stream ready"
        : statusKind === "error"
          ? "Stream error"
          : "Processing on Stream"
      : "Not uploaded";

  return (
    <section className={cn(adminCard, className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={adminMutedLabel}>Watch explainer</p>
          <h2 className={cn(adminHeading, "mt-1 text-[17px]")}>
            Skill video · Cloudflare Stream
          </h2>
          <p className={cn(adminSubtext, "mt-1 max-w-xl")}>
            One video for this skill’s Watch step. Prefer attaching a UID from
            the Cloudflare Stream panel. File upload is optional for small MP4s.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#5A6B82]">
          {statusKind === "processing" || (uploading && uploadPhase === "processing") ? (
            <Loader2 className="size-3.5 motion-safe:animate-spin text-teal" aria-hidden />
          ) : null}
          {uploading && uploadPhase === "processing" ? "Processing on Stream" : statusLabel}
        </span>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {existing?.playback_url ? (
        <div className="mb-4 overflow-hidden rounded-[14px] border border-[#EAEEF3] bg-[#0B1220]">
          <iframe
            title={existing.title || "Skill Watch video"}
            src={existing.playback_url}
            className="aspect-video w-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        {!compact ? (
          <>
            <label className="block text-sm font-semibold text-navy">
              Title
              <input
                className={adminInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading || attaching}
              />
            </label>
            <label className="block text-sm font-semibold text-navy">
              Duration (minutes)
              <input
                className={adminInput}
                type="number"
                min={0}
                max={240}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                disabled={uploading || attaching}
              />
            </label>
          </>
        ) : null}

        <label className={cn("block text-sm font-semibold text-navy", !compact && "sm:col-span-2")}>
          Stream UID or iframe URL
          <input
            className={adminInput}
            value={uidInput}
            onChange={(e) => setUidInput(e.target.value)}
            placeholder="Paste UID from Cloudflare Stream"
            disabled={uploading || attaching}
          />
        </label>
        <div className={cn(!compact && "sm:col-span-2")}>
          <button
            type="button"
            className={adminBtnPrimary}
            disabled={uploading || attaching || !uidInput.trim()}
            onClick={() => void onAttach()}
          >
            {attaching ? "Attaching…" : existing ? "Replace from UID" : "Attach Stream UID"}
          </button>
        </div>
        <div className={cn(!compact && "sm:col-span-2")}>
          <p className="text-sm font-semibold text-navy">Or upload a compressed file</p>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            className="hidden"
            disabled={uploading || attaching}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
              setSuccess(null);
            }}
          />
          <AdminFileDropZone
            className="mt-2"
            disabled={uploading || attaching}
            hint="Drop a video here or click Choose video."
            onFile={(next) => {
              setFile(next);
              setError(null);
              setSuccess(null);
            }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={adminBtnSecondary}
                disabled={uploading || attaching}
                onClick={() => inputRef.current?.click()}
              >
                <Video className="size-3.5" aria-hidden />
                Choose video
              </button>
              <button
                type="button"
                className={adminBtnPrimary}
                disabled={uploading || attaching || !file}
                onClick={() => void onUpload()}
              >
                <Upload className="size-3.5" aria-hidden />
                {uploading
                  ? uploadPhase === "processing"
                    ? "Processing on Stream…"
                    : "Uploading to Stream…"
                  : existing
                    ? "Replace on Stream"
                    : "Upload to Stream"}
              </button>
            </div>
          </AdminFileDropZone>
          {file ? (
            <p className={cn(adminMeta, "mt-2")}>
              {file.name} · {formatVideoBytes(file.size)}
              {file.size > STREAM_DIRECT_MAX_BYTES
                ? " · too large — use the Cloudflare panel"
                : " · sent direct to Stream"}
            </p>
          ) : (
            <p className={cn(adminMeta, "mt-2")}>
              Tag <span className="text-navy">{tag}</span> · MP4 ≤{" "}
              {formatVideoBytes(STREAM_DIRECT_MAX_BYTES)}, no compress
            </p>
          )}
        </div>
      </div>

      <AdminStreamUploadStatus
        phase={
          uploading
            ? uploadPhase === "processing"
              ? "processing"
              : "uploading"
            : "idle"
        }
        progress={uploading ? (progress ?? 0) : 0}
        fileName={file?.name}
      />
    </section>
  );
}
