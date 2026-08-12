"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Video } from "lucide-react";
import { Upload as TusUpload } from "tus-js-client";
import {
  adminApi,
  type StreamVideoItem,
  type StreamVideoTag,
} from "@/lib/admin-api";
import {
  STREAM_SOFT_MAX_BYTES,
  STREAM_TUS_CHUNK_BYTES,
  formatVideoBytes,
  prepareVideoForStreamUpload,
} from "@/lib/stream-video-upload";
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
  const [existing, setExisting] = useState<StreamVideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "compress" | "upload">("idle");
  const [progress, setProgress] = useState<number | null>(null);
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
      setError("Choose a compressed MP4/WebM first (aim for ≤ 80 MB).");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);
    setPhase("compress");
    try {
      const prepared = await prepareVideoForStreamUpload(file, (p, pct) => {
        setPhase(p === "compress" ? "compress" : "upload");
        if (p === "compress") setProgress(pct);
      });
      setPhase("upload");
      setProgress(0);
      const created = await adminApi.createStreamDirectUpload({
        tag,
        title: title.trim() || defaultTitle,
        max_duration_seconds: 3600,
        upload_length: prepared.file.size,
      });
      await new Promise<void>((resolve, reject) => {
        const upload = new TusUpload(prepared.file, {
          endpoint: created.uploadURL,
          chunkSize: STREAM_TUS_CHUNK_BYTES,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          metadata: {
            filename: prepared.file.name,
            filetype: prepared.file.type || "video/mp4",
          },
          onError: (err) => reject(err),
          onProgress: (bytesUploaded, bytesTotal) => {
            if (bytesTotal > 0) {
              setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
            }
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });
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
      setSuccess(
        hubs > 0
          ? `Watch video saved.${shrinkNote} Synced to ${hubs} hub${hubs === 1 ? "" : "s"}.`
          : `Watch video saved to Stream library.${shrinkNote}`,
      );
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setProgress(100);
      setExisting(saved);
      onUploaded?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      setUploading(false);
      setPhase("idle");
    }
  }

  const statusLabel = loading
    ? "Checking…"
    : existing?.playback_url
      ? existing.status === "ready"
        ? "Stream ready"
        : existing.status || "On Stream"
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
            One video for this skill’s Watch step. Upload a compressed 720p file
            (H.264 MP4, ideally under {formatVideoBytes(STREAM_SOFT_MAX_BYTES)}
            ). Larger files are compressed in-browser before upload.
          </p>
        </div>
        <span className="font-mono text-xs text-[#94A3B8]">{statusLabel}</span>
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
                disabled={uploading}
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
                disabled={uploading}
              />
            </label>
          </>
        ) : null}

        <div className={cn(!compact && "sm:col-span-2")}>
          <p className="text-sm font-semibold text-navy">Compressed video file</p>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
              setSuccess(null);
            }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={adminBtnSecondary}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Video className="size-3.5" aria-hidden />
              Choose video
            </button>
            <button
              type="button"
              className={adminBtnPrimary}
              disabled={uploading || !file}
              onClick={() => void onUpload()}
            >
              <Upload className="size-3.5" aria-hidden />
              {uploading
                ? phase === "compress"
                  ? "Compressing…"
                  : "Uploading to Stream…"
                : existing
                  ? "Replace on Stream"
                  : "Upload to Stream"}
            </button>
          </div>
          {file ? (
            <p className={cn(adminMeta, "mt-2")}>
              {file.name} · {formatVideoBytes(file.size)}
              {file.size > STREAM_SOFT_MAX_BYTES
                ? " · will compress before upload"
                : " · ready"}
            </p>
          ) : (
            <p className={cn(adminMeta, "mt-2")}>
              Tag <span className="text-navy">{tag}</span> · prefer compressed
              MP4 ≤ {formatVideoBytes(STREAM_SOFT_MAX_BYTES)}
            </p>
          )}
        </div>
      </div>

      {progress != null ? (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-[#EEF2F6]">
            <div
              className="h-full rounded-full bg-cyan transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className={cn(adminMeta, "mt-1")}>
            {phase === "compress" ? "Compressing" : "Uploading"} · {progress}%
          </p>
        </div>
      ) : null}
    </section>
  );
}
