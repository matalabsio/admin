"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload, Video } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import {
  AdminStreamStatusBadge,
  AdminStreamUploadStatus,
} from "@/components/admin/admin-stream-status";
import { AdminFileDropZone } from "@/components/admin/admin-file-drop-zone";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminMeta,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { streamStatusKind, waitForStreamReady } from "@/lib/stream-ready";
import {
  STREAM_DIRECT_MAX_BYTES,
  formatVideoBytes,
  prepareVideoForStreamUpload,
  uploadFileToStreamTus,
} from "@/lib/stream-video-upload";
import { cn } from "@/lib/utils";

type Props = {
  setId: string;
  className?: string;
  /** No outer card — use inside Listening 50/50 media row. */
  embedded?: boolean;
};

function shortSetId(setId: string): string {
  const value = setId.trim();
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function AdminSetWatchVideoCard({
  setId,
  className,
  embedded = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "processing">(
    "uploading",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const kind = uid
    ? streamStatusKind(status)
    : streamStatusKind(null);
  const busy = uploading;

  const loadStatus = useCallback(async () => {
    const res = await adminApi.checkBankWatchVideo(setId);
    setUid(res.intro_stream_uid);
    setPreviewUrl(res.preview_url);
    setStatus(res.status);
    return res;
  }, [setId]);

  useEffect(() => {
    let cancelled = false;
    void loadStatus().catch(() => {
      if (!cancelled) {
        setUid(null);
        setPreviewUrl(null);
        setStatus(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  useEffect(() => {
    if (!uid || streamStatusKind(status) !== "processing" || uploading) return;
    const id = window.setInterval(() => {
      void loadStatus().catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(id);
  }, [uid, status, uploading, loadStatus]);

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
      const created = await adminApi.createBankWatchVideoDirectUpload(setId, {
        upload_length: prepared.file.size,
        title: "Set Watch explainer",
      });
      await uploadFileToStreamTus(prepared.file, created.uploadURL, setProgress);
      setProgress(100);
      setUploadPhase("processing");
      setUid(created.uid);
      setStatus("processing");
      await waitForStreamReady(created.uid, { minMs: 1200, intervalMs: 2000 });
      const saved = await adminApi.completeBankWatchVideo(setId, {
        stream_uid: created.uid,
        title: "Set Watch explainer",
      });
      setUid(saved.intro_stream_uid);
      setPreviewUrl(saved.preview_url || null);
      setStatus(saved.status);
      await loadStatus();
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setProgress(0);
      setUploadPhase("uploading");
      const ready = streamStatusKind(saved.status) === "ready";
      setSuccess(
        ready
          ? "Watch video saved for this set only. Students see it on this hub’s Watch step."
          : "Uploaded · still processing on Stream. This set will use the skill intro until Ready.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(0);
      setUploadPhase("uploading");
    } finally {
      setUploading(false);
    }
  }

  const body = (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={adminMutedLabel}>Set Watch video</p>
          <h2 className={cn(adminHeading, "mt-1 text-[17px]")}>
            Locked Stream explainer
          </h2>
          <p className={cn(adminSubtext, "mt-1")}>
            This file is bound to this set only — not Admin → Videos.
          </p>
          <p className={cn(adminMeta, "mt-1 text-[#5A6B82]")}>
            Set · {shortSetId(setId)}
          </p>
        </div>
        <AdminStreamStatusBadge kind={kind === "empty" && !uid ? "empty" : kind} busy={busy} />
      </div>

      {error ? (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {previewUrl && kind === "ready" ? (
        <div className="mb-4 overflow-hidden rounded-[14px] border border-[#EAEEF3] bg-black">
          <iframe
            key={previewUrl}
            title="Set Watch preview"
            src={previewUrl}
            className="aspect-video w-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      <AdminFileDropZone
        disabled={uploading}
        hint="Drop a video here or click Choose video."
        onFile={(next) => {
          setFile(next);
          setError(null);
          setSuccess(null);
        }}
      >
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={cn(adminBtnSecondary, "gap-2")}
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
            {uploading ? (
              <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden />
            ) : (
              <Upload className="size-3.5" aria-hidden />
            )}
            {uploading
              ? uploadPhase === "processing"
                ? "Processing…"
                : "Uploading…"
              : uid
                ? "Replace on Stream"
                : "Upload to Stream"}
          </button>
          <button
            type="button"
            className={adminBtnSecondary}
            disabled={uploading}
            onClick={() => void loadStatus().catch(() => undefined)}
          >
            Check Stream
          </button>
        </div>
      </AdminFileDropZone>
      {file ? (
        <p className={cn(adminMeta, "mt-3")}>
          {file.name} · {formatVideoBytes(file.size)}
          {file.size > STREAM_DIRECT_MAX_BYTES
            ? " · too large — use the Cloudflare panel"
            : " · sent direct to Stream"}
        </p>
      ) : (
        <p className={cn(adminMeta, "mt-3")}>
          MP4 ≤ {formatVideoBytes(STREAM_DIRECT_MAX_BYTES)} · signed playback · this set only
        </p>
      )}
      <AdminStreamUploadStatus
        phase={
          uploading
            ? uploadPhase === "processing"
              ? "processing"
              : "uploading"
            : "idle"
        }
        progress={uploading ? progress : 0}
        fileName={file?.name}
      />
    </>
  );

  if (embedded) {
    return <div className={className}>{body}</div>;
  }

  return <section className={cn(adminCard, className)}>{body}</section>;
}
