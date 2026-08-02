"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Upload,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  adminApi,
  type SpeakingBuilderQuestion,
} from "@/lib/admin-api";
import {
  type BuilderSource,
  builderBackHref,
  builderPartHref,
} from "@/components/admin/admin-builder-source";
import { AdminBuilderStickyBar } from "@/components/admin/admin-builder-sticky-bar";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminLink,
  adminMutedLabel,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type Props = {
  source: BuilderSource;
  part: number;
};

type DraftQuestion = SpeakingBuilderQuestion & {
  localId: string;
  localPreviewUrl?: string | null;
  uploading?: boolean;
};

function newLocalId() {
  return `local-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultQuestion(part: number): DraftQuestion {
  return {
    localId: newLocalId(),
    prompt: "",
    speak_time_sec: part === 2 ? 120 : 120,
    min_skip_sec: 30,
    prep_sec: part === 2 ? 60 : 0,
    record_sec: part === 2 ? 120 : 120,
    video_url: null,
    video_preview_url: null,
    video_name: null,
    localPreviewUrl: null,
  };
}

function formatMmSs(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function parseMmSs(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Math.max(0, Number.parseInt(trimmed, 10));
  const m = /^(\d{1,2}):([0-5]?\d)$/.exec(trimmed);
  if (!m) return null;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
}

const PARTS = [1, 2, 3] as const;

export function AdminSpeakingBuilderClient({ source, part }: Props) {
  const router = useRouter();
  const safePart = part >= 1 && part <= 3 ? part : 1;

  const [mockLabel, setMockLabel] = useState("Speaking");
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    defaultQuestion(safePart),
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewTimeLeft, setPreviewTimeLeft] = useState(0);
  const [previewCanSkip, setPreviewCanSkip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const previewTimerRef = useRef<number | null>(null);

  const questionCountLabel = useMemo(() => {
    const n = questions.length;
    return `${n} question${n === 1 ? "" : "s"} · Part ${safePart}`;
  }, [questions.length, safePart]);

  const backHref = builderBackHref(source);
  const backLabel =
    source.kind === "mock" ? "Back to test" : "Back to question bank";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        source.kind === "mock"
          ? await adminApi.loadSpeakingPart(source.mockId, safePart)
          : await adminApi.loadBankSpeakingPart(source.setId, safePart);

      if (source.kind === "mock") {
        const mock = await adminApi.getMock(source.mockId).catch(() => null);
        if (mock) {
          const cat =
            mock.catalog_number != null
              ? `Test ${mock.catalog_number}`
              : mock.title;
          setMockLabel(`${cat} · Speaking`);
        }
      } else {
        const set = await adminApi.getQuestionBankSet(source.setId).catch(() => null);
        if (set) {
          setMockLabel(`${set.title} · Speaking`);
        }
      }

      if (res.questions.length === 0) {
        setQuestions([defaultQuestion(safePart)]);
      } else {
        setQuestions(
          res.questions.map((q) => ({
            localId: q.id || newLocalId(),
            id: q.id,
            question_number: q.question_number,
            prompt: q.prompt || "",
            speak_time_sec: q.speak_time_sec ?? q.record_sec ?? 120,
            min_skip_sec: q.min_skip_sec ?? 30,
            prep_sec: q.prep_sec ?? (safePart === 2 ? 60 : 0),
            record_sec: q.record_sec ?? q.speak_time_sec ?? 120,
            video_url: q.video_url,
            video_preview_url: q.video_preview_url,
            video_name:
              ("video_name" in q && q.video_name) ||
              (q.video_url ? q.video_url.split("/").pop() : null) ||
              null,
            localPreviewUrl: null,
          })),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load speaking part");
    } finally {
      setLoading(false);
    }
  }, [source, safePart]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current != null) {
        window.clearInterval(previewTimerRef.current);
      }
    };
  }, []);

  const updateQuestion = useCallback(
    (localId: string, patch: Partial<DraftQuestion>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.localId === localId ? { ...q, ...patch } : q)),
      );
    },
    [],
  );

  const addRow = () => {
    setQuestions((prev) => [...prev, defaultQuestion(safePart)]);
  };

  const removeQuestion = (localId: string) => {
    setQuestions((prev) => {
      const next = prev.filter((q) => q.localId !== localId);
      return next.length ? next : [defaultQuestion(safePart)];
    });
  };

  const onDropReorder = (toIndex: number) => {
    if (dragFrom == null || dragFrom === toIndex) {
      setDragFrom(null);
      return;
    }
    setQuestions((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(dragFrom, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
    setDragFrom(null);
  };

  const probeVideoDuration = (file: File): Promise<number | null> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        const d = Number.isFinite(el.duration) ? el.duration : null;
        URL.revokeObjectURL(url);
        resolve(d);
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      el.src = url;
    });

  const uploadVideo = async (localId: string, file: File) => {
    setError(null);
    setSaveMsg(null);
    const duration = await probeVideoDuration(file);
    if (duration != null && duration > 30) {
      setError(
        "Video is longer than 30 seconds. Upload a short 10–15s examiner clip.",
      );
      return;
    }
    const localUrl = URL.createObjectURL(file);
    updateQuestion(localId, {
      localPreviewUrl: localUrl,
      uploading: true,
      video_name: file.name,
    });
    try {
      const res =
        source.kind === "mock"
          ? await adminApi.uploadSpeakingVideo(source.mockId, safePart, file)
          : await adminApi.uploadBankSpeakingVideo(source.setId, safePart, file);
      updateQuestion(localId, {
        video_url: res.video_url,
        video_preview_url: res.video_preview_url,
        video_name: res.video_name,
        uploading: false,
      });
      setSaveMsg("Video uploaded to R2.");
    } catch (e) {
      updateQuestion(localId, { uploading: false });
      setError(e instanceof Error ? e.message : "Video upload failed");
    }
  };

  const clearVideo = (localId: string) => {
    const q = questions.find((row) => row.localId === localId);
    if (q?.localPreviewUrl) URL.revokeObjectURL(q.localPreviewUrl);
    updateQuestion(localId, {
      video_url: null,
      video_preview_url: null,
      video_name: null,
      localPreviewUrl: null,
    });
  };

  const canSave = questions.every((q) => {
    if (!q.prompt.trim()) return false;
    if (safePart === 2 && !q.video_url?.trim()) return false;
    if (q.min_skip_sec > q.speak_time_sec) return false;
    return true;
  });

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      const saveBody = {
        questions: questions.map((q) => ({
          prompt: q.prompt.trim(),
          speak_time_sec: q.speak_time_sec,
          min_skip_sec: Math.min(q.min_skip_sec, q.speak_time_sec),
          prep_sec: safePart === 2 ? q.prep_sec || 60 : 0,
          record_sec: q.speak_time_sec,
          video_url: q.video_url,
        })),
      };
      if (source.kind === "mock") {
        await adminApi.saveSpeakingPart(source.mockId, safePart, saveBody);
      } else {
        await adminApi.saveBankSpeakingPart(source.setId, safePart, saveBody);
      }
      setSaveMsg(`Saved Part ${safePart} · ${questions.length} question(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const stopPreviewTimer = () => {
    if (previewTimerRef.current != null) {
      window.clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  const startPreviewForIndex = useCallback(
    (index: number, list: DraftQuestion[]) => {
      stopPreviewTimer();
      const q = list[index];
      if (!q) return;
      const speak = Math.max(1, q.speak_time_sec || 120);
      const minSkip = Math.min(q.min_skip_sec || 0, speak);
      setPreviewIndex(index);
      setPreviewTimeLeft(speak);
      setPreviewCanSkip(minSkip <= 0);
      let elapsed = 0;
      previewTimerRef.current = window.setInterval(() => {
        elapsed += 1;
        setPreviewTimeLeft((t) => Math.max(0, t - 1));
        if (elapsed >= minSkip) setPreviewCanSkip(true);
        if (elapsed >= speak) {
          stopPreviewTimer();
          setPreviewCanSkip(true);
        }
      }, 1000);
    },
    [],
  );

  const openPreview = () => {
    setPreviewMode(true);
    startPreviewForIndex(0, questions);
  };

  const closePreview = () => {
    stopPreviewTimer();
    setPreviewMode(false);
  };

  const previewNext = () => {
    if (!previewCanSkip) return;
    if (previewIndex >= questions.length - 1) {
      closePreview();
      return;
    }
    startPreviewForIndex(previewIndex + 1, questions);
  };

  const previewQ = questions[previewIndex];
  const previewSrc =
    previewQ?.localPreviewUrl || previewQ?.video_preview_url || null;
  const previewProgressPct = previewQ
    ? `${Math.max(
        0,
        Math.min(
          100,
          ((previewQ.speak_time_sec - previewTimeLeft) /
            Math.max(1, previewQ.speak_time_sec)) *
            100,
        ),
      )}%`
    : "0%";

  if (loading) {
    return <p className="text-[#5A6B82]">Loading speaking builder…</p>;
  }

  return (
    <div className="mx-auto max-w-[1100px] pb-28">
      <Link
        href={backHref}
        className={cn(
          "mb-5 inline-flex items-center gap-[7px] text-sm font-semibold text-teal",
          adminLink,
        )}
      >
        <ArrowLeft className="size-4" strokeWidth={2.2} />
        {backLabel}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-teal">
            {mockLabel}
          </p>
          <h1 className="font-display text-[30px] font-extrabold leading-none tracking-[-0.025em] text-navy">
            Speaking builder
          </h1>
        </div>
        <p className="font-mono text-[12.5px] text-[#94A3B8]">
          {questionCountLabel}
        </p>
      </div>

      {/* Part chips — match Standalone */}
      <div className="mb-5 flex flex-wrap gap-2">
        {PARTS.map((p) => {
          const active = p === safePart;
          return (
            <button
              key={p}
              type="button"
              onClick={() =>
                router.push(builderPartHref(source, "speaking", p))
              }
              className={cn(
                "rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-semibold transition-colors",
                active
                  ? "border-cyan bg-[#E6F6F8] text-teal"
                  : "border-[#E4E9F0] bg-white text-[#5A6B82] hover:border-cyan",
              )}
            >
              Part {p}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mb-4 text-sm font-medium text-[#B4474B]">{error}</p>
      ) : null}
      {saveMsg ? (
        <p className="mb-4 text-sm font-medium text-[#15935B]">{saveMsg}</p>
      ) : null}

      {/* Questions card */}
      <div className="rounded-[18px] border border-[#EAEEF3] bg-white px-5 py-[26px] shadow-[0_8px_22px_rgba(13,31,60,0.04)] sm:px-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-bold text-navy">
            Part {safePart} questions
          </h2>
          <button
            type="button"
            onClick={addRow}
            className={cn(adminBtnPrimary, "gap-2 px-4 py-2.5 text-[13.5px]")}
          >
            <Plus className="size-[15px]" strokeWidth={2.4} />
            Add row
          </button>
        </div>

        {questions.length === 0 ? (
          <p className="px-0.5 py-2 text-[13.5px] text-[#94A3B8]">
            No questions yet — add a row to upload a short examiner video.
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          {questions.map((q, index) => {
            const videoSrc = q.localPreviewUrl || q.video_preview_url;
            const timeWarn = q.min_skip_sec > q.speak_time_sec;
            const statusLabel = q.uploading
              ? "Uploading…"
              : q.video_url
                ? "Ready in R2"
                : "No video";
            const titleLabel =
              q.video_name ||
              (q.video_url ? q.video_url.split("/").pop() : "Upload a 10–15s clip");

            return (
              <div
                key={q.localId}
                draggable
                onDragStart={() => setDragFrom(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropReorder(index)}
                className="rounded-[13px] border border-[#EAEEF3] bg-[#FBFCFD] px-[18px] py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 pt-1.5 text-[#B7C1CF]">
                    <GripVertical className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className="shrink-0 rounded-[7px] bg-[#E6F6F8] px-2 py-1 font-mono text-xs font-semibold text-teal">
                        Q{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.localId)}
                        className="ml-auto text-[12.5px] font-semibold text-[#B4474B] hover:underline"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Video upload (replaces Vimeo URL field) */}
                    <p className={cn(adminMutedLabel, "mb-2")}>
                      Examiner video (10–15s MP4 / WebM)
                    </p>
                    <div className="mb-3.5 flex flex-wrap items-center gap-3">
                      <input
                        ref={(el) => {
                          fileRefs.current[q.localId] = el;
                        }}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void uploadVideo(q.localId, file);
                        }}
                      />
                      <button
                        type="button"
                        disabled={q.uploading}
                        onClick={() => fileRefs.current[q.localId]?.click()}
                        className={cn(
                          adminBtnSecondary,
                          "gap-1.5 rounded-[9px] px-3 py-2 text-[13px]",
                        )}
                      >
                        <Upload className="size-3.5" />
                        {q.uploading ? "Uploading…" : "Upload video"}
                      </button>
                      {q.video_url || q.localPreviewUrl ? (
                        <button
                          type="button"
                          onClick={() => clearVideo(q.localId)}
                          className="text-[12.5px] font-semibold text-[#5A6B82] hover:text-[#B4474B]"
                        >
                          Clear
                        </button>
                      ) : null}
                      {safePart === 2 && !q.video_url ? (
                        <span className="text-xs font-medium text-[#B4474B]">
                          Required for Part 2
                        </span>
                      ) : null}
                    </div>

                    <div className="mb-4 flex items-center gap-3.5">
                      {videoSrc ? (
                        <video
                          key={videoSrc}
                          src={videoSrc}
                          className="h-16 w-24 shrink-0 rounded-[9px] border border-[#E4E9F0] bg-[#F1F4F8] object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-[9px] border border-[#E4E9F0] bg-[#F1F4F8]">
                          <Video className="size-5 text-[#94A3B8]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-navy">
                          {titleLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-[#94A3B8]">
                          {statusLabel}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      <label className="block">
                        <span className={cn(adminMutedLabel, "mb-2 block")}>
                          Speak time (mm:ss)
                        </span>
                        <input
                          type="text"
                          placeholder="2:00"
                          className={cn(
                            adminInput,
                            "mt-0 rounded-[9px] px-[13px] py-2.5 text-[13.5px]",
                          )}
                          value={formatMmSs(q.speak_time_sec)}
                          onChange={(e) => {
                            const parsed = parseMmSs(e.target.value);
                            if (parsed == null) return;
                            updateQuestion(q.localId, {
                              speak_time_sec: parsed,
                              record_sec: parsed,
                            });
                          }}
                        />
                      </label>
                      <label className="block">
                        <span className={cn(adminMutedLabel, "mb-2 block")}>
                          Min. time before skip (mm:ss)
                        </span>
                        <input
                          type="text"
                          placeholder="0:30"
                          className={cn(
                            adminInput,
                            "mt-0 rounded-[9px] px-[13px] py-2.5 text-[13.5px]",
                            timeWarn && "border-[#B4474B]",
                          )}
                          value={formatMmSs(q.min_skip_sec)}
                          onChange={(e) => {
                            const parsed = parseMmSs(e.target.value);
                            if (parsed == null) return;
                            updateQuestion(q.localId, { min_skip_sec: parsed });
                          }}
                        />
                      </label>
                    </div>
                    {timeWarn ? (
                      <p className="mb-3 text-xs text-[#B4474B]">
                        Min. skip time cannot exceed speak time.
                      </p>
                    ) : null}

                    {safePart === 2 ? (
                      <>
                        <label className="mb-3 block">
                          <span className={cn(adminMutedLabel, "mb-2 block")}>
                            Cue card (bullet points shown on screen)
                          </span>
                          <textarea
                            rows={4}
                            placeholder={
                              "Describe a time you… You should say:\n• when it happened\n• where you were\n• …"
                            }
                            className={cn(
                              adminInput,
                              "mt-0 min-h-[100px] resize-y rounded-[9px] px-[13px] py-[11px] text-[13.5px] leading-[1.55]",
                            )}
                            value={q.prompt}
                            onChange={(e) =>
                              updateQuestion(q.localId, {
                                prompt: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="block max-w-[200px]">
                          <span className={cn(adminMutedLabel, "mb-2 block")}>
                            Prep time (sec)
                          </span>
                          <input
                            type="number"
                            min={0}
                            className={cn(
                              adminInput,
                              "mt-0 rounded-[9px] px-[13px] py-2.5 text-[13.5px]",
                            )}
                            value={q.prep_sec}
                            onChange={(e) =>
                              updateQuestion(q.localId, {
                                prep_sec:
                                  Number.parseInt(e.target.value, 10) || 0,
                              })
                            }
                          />
                        </label>
                      </>
                    ) : (
                      <label className="block">
                        <span className={cn(adminMutedLabel, "mb-2 block")}>
                          Question prompt
                        </span>
                        <textarea
                          rows={2}
                          placeholder="Enter the examiner question…"
                          className={cn(
                            adminInput,
                            "mt-0 min-h-[72px] resize-y rounded-[9px] px-[13px] py-[11px] text-[13.5px] leading-[1.55]",
                          )}
                          value={q.prompt}
                          onChange={(e) =>
                            updateQuestion(q.localId, {
                              prompt: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fullscreen student preview — Standalone dark overlay */}
      {previewMode && previewQ ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1F3C] p-4 sm:p-8">
          <div className="flex w-full max-w-[720px] flex-col">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-mono text-[12px] text-[#94A3B8]">
                Part {safePart} · Q{previewIndex + 1}/{questions.length} ·{" "}
                {formatMmSs(previewTimeLeft)}
              </p>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-[11px] border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:border-white/40"
              >
                Close
              </button>
            </div>

            <div className="mb-5 aspect-video overflow-hidden rounded-2xl bg-black">
              {previewSrc ? (
                <video
                  key={`${previewQ.localId}-${previewIndex}`}
                  src={previewSrc}
                  className="h-full w-full object-contain"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/50">
                  No video for this question
                </div>
              )}
            </div>

            {safePart === 2 && previewQ.prompt.trim() ? (
              <div className="mb-5 whitespace-pre-wrap rounded-xl bg-white/[0.06] px-[22px] py-[18px] text-[14.5px] leading-relaxed text-[#E2E8F0]">
                {previewQ.prompt}
              </div>
            ) : previewQ.prompt.trim() ? (
              <p className="mb-5 text-[15px] font-medium leading-relaxed text-white">
                {previewQ.prompt}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-5">
              <div className="mr-0 h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-cyan transition-[width] duration-1000 ease-linear"
                  style={{ width: previewProgressPct }}
                />
              </div>
              <button
                type="button"
                disabled={!previewCanSkip}
                onClick={previewNext}
                className={cn(
                  "whitespace-nowrap rounded-[11px] px-6 py-[13px] text-sm font-bold",
                  previewCanSkip
                    ? "cursor-pointer bg-cyan text-navy"
                    : "cursor-not-allowed bg-white/10 text-white/40",
                )}
              >
                {previewIndex >= questions.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminBuilderStickyBar
        source={source}
        activeModule="speaking"
        label={questionCountLabel}
        previewMode={previewMode}
        onTogglePreview={() => {
          if (previewMode) closePreview();
          else openPreview();
        }}
        onSave={() => void handleSave()}
        saving={saving}
        previewDisabled={questions.length === 0}
        saveDisabled={!canSave || saving}
      />
    </div>
  );
}
