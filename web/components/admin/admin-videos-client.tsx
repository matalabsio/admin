"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ExternalLink, RefreshCw, Upload } from "lucide-react";
import { Upload as TusUpload } from "tus-js-client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminMeta,
  adminMutedLabel,
  adminStatusBadgeStyles,
  adminSubtext,
  adminTable,
  adminTableHead,
} from "@/components/admin/admin-ui";
import {
  adminApi,
  type StreamLibraryItem,
  type StreamVideoItem,
  type StreamVideoTag,
} from "@/lib/admin-api";
import {
  STREAM_DIRECT_MAX_BYTES,
  STREAM_TUS_CHUNK_BYTES,
  formatVideoBytes,
  prepareVideoForStreamUpload,
} from "@/lib/stream-video-upload";
import { cn } from "@/lib/utils";

const TAG_OPTIONS: { value: StreamVideoTag; label: string; hint: string }[] = [
  { value: "listening-intro", label: "Listening", hint: "Watch on all Listening practice" },
  { value: "reading-intro", label: "Reading", hint: "Watch on all Reading practice" },
  { value: "writing-intro", label: "Writing", hint: "Watch on all Writing practice" },
  { value: "speaking-intro", label: "Speaking", hint: "Watch on all Speaking practice" },
  { value: "ielts-intro", label: "IELTS intro", hint: "Landing / library only" },
  { value: "bandforge-intro", label: "BandForge intro", hint: "Library only" },
];

const DEFAULT_TITLES: Record<StreamVideoTag, string> = {
  "bandforge-intro": "BandForge intro",
  "ielts-intro": "IELTS intro",
  "listening-intro": "Listening intro",
  "reading-intro": "Reading intro",
  "writing-intro": "Writing intro",
  "speaking-intro": "Speaking intro",
};

function isStreamTag(value: string | null): value is StreamVideoTag {
  return !!value && TAG_OPTIONS.some((opt) => opt.value === value);
}

function formatDuration(item: StreamVideoItem | undefined, library?: StreamLibraryItem) {
  if (library?.duration_sec && library.duration_sec > 0) {
    const mins = Math.max(1, Math.round(library.duration_sec / 60));
    return `${mins} min`;
  }
  if (item?.duration_min && item.duration_min > 0 && item.duration_min !== 12) {
    return `${item.duration_min} min`;
  }
  return null;
}

export function AdminVideosClient() {
  const searchParams = useSearchParams();
  const tagFromQuery = searchParams.get("tag");
  const initialTag = isStreamTag(tagFromQuery) ? tagFromQuery : "listening-intro";
  const formId = useId();

  const [items, setItems] = useState<StreamVideoItem[]>([]);
  const [library, setLibrary] = useState<StreamLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tag, setTag] = useState<StreamVideoTag>(initialTag);
  const [uidInput, setUidInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [importingUid, setImportingUid] = useState<string | null>(null);
  const [importTagByUid, setImportTagByUid] = useState<Record<string, StreamVideoTag>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const assignedCount = TAG_OPTIONS.filter((opt) =>
    items.some((item) => item.tag === opt.value && item.stream_uid),
  ).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [saved, remote] = await Promise.all([
        adminApi.listStreamVideos(),
        adminApi.listStreamLibrary().catch(() => ({ items: [] as StreamLibraryItem[] })),
      ]);
      setItems(saved.items);
      setLibrary(remote.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load videos");
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from URL only
  }, [tagFromQuery]);

  async function attachExisting(
    streamUid: string,
    attachTag: StreamVideoTag,
    attachTitle?: string,
  ) {
    const uid = streamUid.trim();
    if (!uid) {
      setError("Paste a Stream video UID or iframe URL.");
      return;
    }
    const saved = await adminApi.completeStreamVideo({
      tag: attachTag,
      title: (attachTitle || DEFAULT_TITLES[attachTag]).trim(),
      stream_uid: uid,
      duration_min: 0,
    });
    const hubs = saved.hubs_updated ?? 0;
    setSuccess(
      hubs > 0
        ? `${DEFAULT_TITLES[attachTag]} is assigned. Watch updated on ${hubs} hub${hubs === 1 ? "" : "s"}.`
        : `${DEFAULT_TITLES[attachTag]} is assigned.`,
    );
    setUidInput("");
    await load();
  }

  async function onAttach() {
    setAttaching(true);
    setError(null);
    setSuccess(null);
    try {
      await attachExisting(uidInput, tag);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach Stream video");
    } finally {
      setAttaching(false);
    }
  }

  async function onImport(item: StreamLibraryItem) {
    const nextTag = importTagByUid[item.uid] || tag;
    setImportingUid(item.uid);
    setError(null);
    setSuccess(null);
    try {
      await attachExisting(item.uid, nextTag, item.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign Stream video");
    } finally {
      setImportingUid(null);
    }
  }

  async function onUpload() {
    if (!file) {
      setError("Choose a video file first.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);
    try {
      const prepared = await prepareVideoForStreamUpload(file);
      setProgress(0);
      const created = await adminApi.createStreamDirectUpload({
        tag,
        title: DEFAULT_TITLES[tag],
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
      await attachExisting(created.uid, tag, DEFAULT_TITLES[tag]);
      setFile(null);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  const busy = loading || attaching || uploading || importingUid != null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminPageHeader
        eyebrow="Cloudflare Stream"
        title="Videos"
        subtitle="Upload a Watch video, or assign one already in Stream."
        actions={
          <button
            type="button"
            className={adminBtnSecondary}
            onClick={() => void load()}
            disabled={busy}
            aria-busy={loading}
          >
            <RefreshCw
              className={cn("mr-1.5 size-3.5", loading && "motion-safe:animate-spin")}
              aria-hidden
            />
            Refresh
          </button>
        }
      />

      <div className="space-y-3" aria-live="polite" aria-atomic="true">
        {error ? (
          <p
            className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            role="status"
          >
            {success}
          </p>
        ) : null}
      </div>

      <section aria-labelledby={`${formId}-upload`} className={adminCard}>
        <h2 id={`${formId}-upload`} className="font-display text-lg font-bold text-navy">
          Upload
        </h2>
        <p className={cn(adminSubtext, "mt-1")}>
          Sent direct to Cloudflare Stream. No in-browser compress.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-end">
          <div>
            <label htmlFor={`${formId}-upload-tag`} className="block text-sm font-semibold text-navy">
              Placement
            </label>
            <select
              id={`${formId}-upload-tag`}
              className={adminInput}
              value={tag}
              onChange={(e) => setTag(e.target.value as StreamVideoTag)}
              disabled={uploading || attaching}
            >
              {TAG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className={cn(adminMeta, "sm:pb-3")}>
            ≤ {formatVideoBytes(STREAM_DIRECT_MAX_BYTES)} · sent direct to Stream
          </p>
        </div>
        <label
          htmlFor={`${formId}-file`}
          className={cn(
            "mt-4 flex min-h-[8.5rem] cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed px-4 py-6 text-center transition-colors duration-200",
            "focus-within:border-cyan focus-within:ring-2 focus-within:ring-cyan/30",
            dragOver ? "border-cyan bg-[#F4FBFC]" : "border-[#CDD7E2] bg-[#FBFCFE]",
            (uploading || attaching) && "pointer-events-none opacity-60",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading && !attaching) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (uploading || attaching) return;
            const next = e.dataTransfer.files?.[0] ?? null;
            if (next) setFile(next);
          }}
        >
          <input
            id={`${formId}-file`}
            className="sr-only"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={uploading || attaching}
          />
          <Upload className="size-5 text-teal" aria-hidden />
          <span className="mt-2 text-sm font-semibold text-navy">
            {file ? file.name : "Drop a video or click to choose"}
          </span>
          <span className={cn(adminMeta, "mt-1")}>
            {file
              ? `${formatVideoBytes(file.size)}${
                  file.size > STREAM_DIRECT_MAX_BYTES
                    ? " · too large — use the Cloudflare panel"
                    : " · ready"
                }`
              : "MP4, WebM, or MOV"}
          </span>
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={adminBtnPrimary}
            onClick={() => void onUpload()}
            disabled={uploading || attaching || !file}
          >
            <Upload className="mr-1.5 size-3.5" aria-hidden />
            {uploading ? "Uploading…" : "Upload"}
          </button>
          {file ? (
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() => setFile(null)}
              disabled={uploading}
            >
              Clear
            </button>
          ) : null}
        </div>
        {progress != null ? (
          <div
            className="mt-4 max-w-md"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Upload progress"
          >
            <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF2F6]">
              <div
                className="h-full rounded-full bg-cyan transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className={cn(adminMeta, "mt-1 text-[#5A6B82]")}>
              Uploading · {progress}%
            </p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby={`${formId}-placements`}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id={`${formId}-placements`} className="font-display text-lg font-bold text-navy">
              Placements
            </h2>
            <p className={cn(adminSubtext, "mt-1")}>
              One video per skill. Students see this on Watch.
            </p>
          </div>
          <p className="font-mono text-xs tabular-nums text-[#5A6B82]">
            {assignedCount} of {TAG_OPTIONS.length} assigned
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TAG_OPTIONS.map((opt) => {
            const assigned = items.find((item) => item.tag === opt.value);
            const remote = library.find((row) => row.uid === assigned?.stream_uid);
            const duration = formatDuration(assigned, remote);
            const ready = assigned?.status === "ready";
            return (
              <li key={opt.value}>
                <article
                  className={cn(
                    adminCard,
                    "h-full p-4 transition-colors duration-200 sm:p-5",
                    assigned ? "border-[#D7E8EC]" : "",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={adminMutedLabel}>{opt.value}</p>
                      <h3 className="mt-1 font-display text-base font-bold text-navy">
                        {opt.label}
                      </h3>
                      <p className={cn(adminSubtext, "mt-0.5")}>{opt.hint}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
                        assigned
                          ? ready
                            ? adminStatusBadgeStyles.live
                            : adminStatusBadgeStyles.pending
                          : adminStatusBadgeStyles.archived,
                      )}
                    >
                      {assigned ? (ready ? "Ready" : assigned.status) : "Empty"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#EDF1F6] pt-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-navy">
                      {assigned ? assigned.title || remote?.name || "Assigned" : "No video yet"}
                    </p>
                    <div className="flex shrink-0 items-center gap-3">
                      {duration ? (
                        <span className={cn(adminMeta, "text-[#5A6B82]")}>{duration}</span>
                      ) : null}
                      {assigned?.playback_url ? (
                        <a
                          href={assigned.playback_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-teal transition-colors duration-200 hover:text-cyan focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/40"
                        >
                          Play
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby={`${formId}-library`}>
        <div className="mb-4">
          <h2 id={`${formId}-library`} className="font-display text-lg font-bold text-navy">
            Cloudflare library
          </h2>
          <p className={cn(adminSubtext, "mt-1")}>
            Videos already in Stream. Pick a placement and assign.
          </p>
        </div>
        <div className={adminTable}>
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">
              Cloudflare Stream videos and their BandForge placement
            </caption>
            <thead className={adminTableHead}>
              <tr>
                <th scope="col" className="px-4 py-3">
                  Video
                </th>
                <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Placement
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Assign</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && library.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#5A6B82]">
                    Loading Stream library…
                  </td>
                </tr>
              ) : library.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#5A6B82]">
                    No videos in Cloudflare Stream yet. Upload in the Stream panel, then refresh.
                  </td>
                </tr>
              ) : (
                library.map((item) => {
                  const selectId = `${formId}-place-${item.uid}`;
                  const selected = importTagByUid[item.uid] || (item.assigned_tag as StreamVideoTag) || tag;
                  return (
                    <tr
                      key={item.uid}
                      className="border-t border-[#EDF1F6] transition-colors duration-200 hover:bg-[#F8FBFC]"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-navy">{item.name}</p>
                        <p className={cn(adminMeta, "mt-0.5 text-[#5A6B82]")}>
                          {item.uid.slice(0, 8)}…{item.uid.slice(-4)}
                          {item.assigned_tag ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-[#15935B]">
                              <Check className="size-3" aria-hidden />
                              {DEFAULT_TITLES[item.assigned_tag as StreamVideoTag] ||
                                item.assigned_tag}
                            </span>
                          ) : null}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3.5 capitalize text-[#5A6B82] sm:table-cell">
                        {item.status}
                      </td>
                      <td className="px-4 py-3.5">
                        <label className="sr-only" htmlFor={selectId}>
                          Placement for {item.name}
                        </label>
                        <select
                          id={selectId}
                          className={cn(adminInput, "mt-0 min-w-[10.5rem] py-2 text-sm")}
                          value={selected}
                          onChange={(e) =>
                            setImportTagByUid((prev) => ({
                              ...prev,
                              [item.uid]: e.target.value as StreamVideoTag,
                            }))
                          }
                          disabled={importingUid === item.uid}
                        >
                          {TAG_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          className={adminBtnSecondary}
                          disabled={busy}
                          onClick={() => void onImport(item)}
                        >
                          {importingUid === item.uid
                            ? "Saving…"
                            : item.assigned_tag
                              ? "Update"
                              : "Assign"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details className={cn(adminCard, "group p-0")}>
        <summary className="cursor-pointer list-none px-4 py-4 sm:px-6 sm:py-5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-base font-bold text-navy">Advanced</p>
              <p className={cn(adminSubtext, "mt-0.5")}>
                Paste a Stream UID or iframe URL if the video is already in Cloudflare.
              </p>
            </div>
            <span className="font-mono text-xs text-[#5A6B82] group-open:hidden">Show</span>
            <span className="hidden font-mono text-xs text-[#5A6B82] group-open:inline">Hide</span>
          </div>
        </summary>
        <div className="space-y-6 border-t border-[#EDF1F6] px-4 py-5 sm:px-6">
          <form
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void onAttach();
            }}
          >
            <div>
              <label htmlFor={`${formId}-tag`} className="block text-sm font-semibold text-navy">
                Placement
              </label>
              <select
                id={`${formId}-tag`}
                className={adminInput}
                value={tag}
                onChange={(e) => setTag(e.target.value as StreamVideoTag)}
                disabled={attaching || uploading}
              >
                {TAG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label htmlFor={`${formId}-uid`} className="block text-sm font-semibold text-navy">
                Stream UID or iframe URL
              </label>
              <input
                id={`${formId}-uid`}
                className={adminInput}
                value={uidInput}
                onChange={(e) => setUidInput(e.target.value)}
                placeholder="UID or cloudflarestream.com/…/iframe"
                autoComplete="off"
                spellCheck={false}
                disabled={attaching || uploading}
              />
            </div>
            <button
              type="submit"
              className={adminBtnPrimary}
              disabled={attaching || uploading || !uidInput.trim()}
            >
              {attaching ? "Assigning…" : "Assign UID"}
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
