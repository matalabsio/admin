"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, RefreshCw, Upload } from "lucide-react";
import { Upload as TusUpload } from "tus-js-client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSkillWatchVideoCard } from "@/components/admin/admin-skill-watch-video-card";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminMeta,
  adminMutedLabel,
  adminSubtext,
  adminTable,
  adminTableHead,
} from "@/components/admin/admin-ui";
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
import { cn } from "@/lib/utils";

const TAG_OPTIONS: { value: StreamVideoTag; label: string; hint: string }[] = [
  { value: "bandforge-intro", label: "BandForge intro", hint: "Global library only" },
  { value: "ielts-intro", label: "IELTS intro", hint: "Global library only" },
  {
    value: "listening-intro",
    label: "Listening intro",
    hint: "Replaces the single Watch video on all listening hubs",
  },
  {
    value: "reading-intro",
    label: "Reading intro",
    hint: "Replaces the single Watch video on all reading hubs",
  },
  {
    value: "writing-intro",
    label: "Writing intro",
    hint: "Replaces the single Watch video on all writing hubs",
  },
  {
    value: "speaking-intro",
    label: "Speaking intro",
    hint: "Replaces the single Watch video on all speaking hubs",
  },
];

const DEFAULT_TITLES: Record<StreamVideoTag, string> = {
  "bandforge-intro": "BandForge intro",
  "ielts-intro": "IELTS intro",
  "listening-intro": "Listening intro",
  "reading-intro": "Reading intro",
  "writing-intro": "Writing intro",
  "speaking-intro": "Speaking intro",
};

const SKILL_TAGS = new Set<StreamVideoTag>([
  "listening-intro",
  "reading-intro",
  "writing-intro",
  "speaking-intro",
]);

function isStreamTag(value: string | null): value is StreamVideoTag {
  return !!value && TAG_OPTIONS.some((opt) => opt.value === value);
}

export function AdminVideosClient() {
  const searchParams = useSearchParams();
  const tagFromQuery = searchParams.get("tag");
  const initialTag = isStreamTag(tagFromQuery) ? tagFromQuery : "listening-intro";

  const [items, setItems] = useState<StreamVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tag, setTag] = useState<StreamVideoTag>(initialTag);
  const [title, setTitle] = useState(DEFAULT_TITLES[initialTag]);
  const [durationMin, setDurationMin] = useState("12");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "compress" | "upload">("idle");
  const [progress, setProgress] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listStreamVideos();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Stream videos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isStreamTag(tagFromQuery) && tagFromQuery !== tag) {
      setTag(tagFromQuery);
      setTitle(DEFAULT_TITLES[tagFromQuery]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from URL only
  }, [tagFromQuery]);

  function onTagChange(next: StreamVideoTag) {
    setTag(next);
    setTitle((current) => {
      const previousDefault = DEFAULT_TITLES[tag];
      if (!current.trim() || current.trim() === previousDefault) {
        return DEFAULT_TITLES[next];
      }
      return current;
    });
  }

  async function onUpload() {
    if (!file) {
      setError("Choose a compressed video file first (aim for ≤ 80 MB).");
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
        title: title.trim() || DEFAULT_TITLES[tag],
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
        title: title.trim() || DEFAULT_TITLES[tag],
        stream_uid: created.uid,
        duration_min: Number.isFinite(minutes) ? Math.max(0, minutes) : 0,
      });
      const hubs = saved.hubs_updated ?? 0;
      const shrink = prepared.compressed
        ? ` Compressed ${formatVideoBytes(prepared.originalBytes)} → ${formatVideoBytes(prepared.finalBytes)}.`
        : "";
      setSuccess(
        hubs > 0
          ? `Saved ${saved.tag}.${shrink} Replaced Watch on ${hubs} hub${hubs === 1 ? "" : "s"}.`
          : `Saved ${saved.tag} to the Stream library.${shrink}`,
      );
      setFile(null);
      setProgress(100);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      setUploading(false);
      setPhase("idle");
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Videos"
        subtitle="Upload compressed explainers to Cloudflare Stream. Skill tags set exactly one Watch video for every hub in that section."
        actions={
          <button
            type="button"
            className={adminBtnSecondary}
            onClick={() => void load()}
            disabled={loading || uploading}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
            Refresh
          </button>
        }
      />

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {SKILL_TAGS.has(tag) ? (
        <AdminSkillWatchVideoCard
          key={tag}
          tag={tag}
          title={DEFAULT_TITLES[tag]}
          onUploaded={() => void load()}
        />
      ) : (
        <section className={adminCard}>
          <p className={adminMutedLabel}>Library upload</p>
          <p className={cn(adminSubtext, "mt-1")}>
            Global intros are library-only. Prefer a compressed 720p MP4 under{" "}
            {formatVideoBytes(STREAM_SOFT_MAX_BYTES)}; larger files are compressed
            in-browser before tus upload to Stream.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-navy">
              Placement tag
              <select
                className={adminInput}
                value={tag}
                onChange={(e) => onTagChange(e.target.value as StreamVideoTag)}
                disabled={uploading}
              >
                {TAG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.hint}
                  </option>
                ))}
              </select>
            </label>
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
            <label className="block text-sm font-semibold text-navy">
              Compressed video file
              <input
                className={adminInput}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={uploading}
              />
              {file ? (
                <span className={cn(adminMeta, "mt-1 block")}>
                  {file.name} · {formatVideoBytes(file.size)}
                  {file.size > STREAM_SOFT_MAX_BYTES
                    ? " · will compress before upload"
                    : ""}
                </span>
              ) : null}
            </label>
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
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className={adminBtnPrimary}
              onClick={() => void onUpload()}
              disabled={uploading || !file}
            >
              <Upload className="size-3.5" aria-hidden />
              {uploading
                ? phase === "compress"
                  ? "Compressing…"
                  : "Uploading…"
                : "Upload to Stream"}
            </button>
            {TAG_OPTIONS.filter((o) => SKILL_TAGS.has(o.value)).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={adminBtnSecondary}
                disabled={uploading}
                onClick={() => onTagChange(opt.value)}
              >
                Switch to {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {SKILL_TAGS.has(tag) ? (
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                adminBtnSecondary,
                tag === opt.value && "border-cyan bg-cyan-soft/50",
              )}
              disabled={uploading}
              onClick={() => onTagChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      <section className={adminTable}>
        <table className="min-w-full text-left text-sm">
          <thead className={adminTableHead}>
            <tr>
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Playback</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[#94A3B8]">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-[#94A3B8]">
                  No Stream videos yet. Upload a compressed file with a placement tag.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.tag} className="border-t border-[#EDF1F6]">
                  <td className="px-4 py-3 font-mono text-xs text-navy">{item.tag}</td>
                  <td className="px-4 py-3 font-semibold text-navy">{item.title}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[#5A6B82]">
                    {item.duration_min ? `${item.duration_min} min` : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#5A6B82]">{item.status}</td>
                  <td className="px-4 py-3">
                    {item.playback_url ? (
                      <a
                        href={item.playback_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-teal hover:text-cyan"
                      >
                        Open
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
