"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import {
  type BuilderSource,
  builderBackHref,
  builderPartHref,
} from "@/components/admin/admin-builder-source";
import { AdminBuilderStickyBar } from "@/components/admin/admin-builder-sticky-bar";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSetWatchVideoCard } from "@/components/admin/admin-set-watch-video-card";
import { AdminFileDropZone } from "@/components/admin/admin-file-drop-zone";
import { AdminInlineRichTextEditor } from "@/components/admin/admin-inline-rich-text-editor";
import {
  hasRichTextContent,
  richHtmlToPlainText,
} from "@/lib/rich-text-html";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminLink,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";
import {
  useAutoStudentPreview,
  useBankDraftReviewNav,
} from "@/lib/use-bank-draft-review-nav";
import {
  EXAM_MODULE_LABELS,
  WRITING_EXAM_MODULES,
  defaultTask1TypeForExamModule,
  isWritingExamModule,
  writingTaxonomyMismatchMessage,
  type WritingExamModule,
} from "@/lib/writing-taxonomy";

type Props = {
  source: BuilderSource;
  part: number;
  taskCount?: number;
};

export function AdminWritingBuilderClient({
  source,
  part,
  taskCount,
}: Props) {
  const defaultTasks = source.kind === "bank" ? 1 : 2;
  const safePart = part === 2 ? 2 : 1;
  const maxTasks = Math.min(2, Math.max(1, taskCount ?? defaultTasks));

  const [prompt, setPrompt] = useState("");
  const [questionType, setQuestionType] = useState(
    safePart === 1 ? "task1_academic" : "task2",
  );
  const [examModule, setExamModule] = useState<WritingExamModule | "">("");
  const [options, setOptions] = useState<Record<string, unknown>>({});
  const [imageKey, setImageKey] = useState("");
  const [imageName, setImageName] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBank = source.kind === "bank";
  const isTask1General = safePart === 1 && questionType === "task1_general";
  const isTask1Academic = safePart === 1 && questionType === "task1_academic";
  const { stickyReviewProps } = useBankDraftReviewNav({
    enabled: isBank,
    setId: isBank ? source.setId : "",
    skill: "writing",
  });

  const promptReady = hasRichTextContent(prompt);
  const completionLabel = promptReady ? "Prompt added" : "No prompt";

  const r2ImageSrc =
    imageKey.trim() && !localPreviewUrl
      ? source.kind === "mock"
        ? adminApi.mockWritingImagePlayUrl(source.mockId, 1, imageKey.trim())
        : adminApi.bankWritingImagePlayUrl(source.setId, 1, imageKey.trim())
      : undefined;
  const displayImageSrc = localPreviewUrl || r2ImageSrc || imagePreviewUrl;

  const backHref = builderBackHref(source);
  const backLabel =
    source.kind === "mock" ? "← Back to test" : "← Back to question bank";

  const eyebrow = useMemo(
    () =>
      source.kind === "bank"
        ? "Question bank · Writing"
        : `Mock · Writing · Task ${safePart}`,
    [safePart, source.kind],
  );

  const placeholder =
    safePart === 2
      ? "Enter the Task 2 essay question…"
      : isTask1General
        ? "Write a letter. Include purpose, bullet points to cover, and the minimum word count…"
        : "Describe the chart/graph/diagram. Include timing guidance and the minimum word count…";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        source.kind === "mock"
          ? await adminApi.loadWritingPart(source.mockId, safePart)
          : await adminApi.loadBankWritingPart(source.setId, safePart);

      let setExam: WritingExamModule | "" = "";
      if (source.kind === "bank") {
        const setMeta = await adminApi.getQuestionBankSet(source.setId);
        if (isWritingExamModule(setMeta.exam_module)) {
          setExam = setMeta.exam_module;
        }
        setExamModule(setExam);
      }

      const loadedType =
        res.question_type ||
        (safePart === 1
          ? defaultTask1TypeForExamModule(setExam || null)
          : "task2");
      setPrompt(res.prompt || "");
      setQuestionType(loadedType);
      setOptions(res.options || {});
      setImageKey(res.image_url || "");
      setImageName(
        ("image_name" in res && res.image_name) ||
          (res.image_url ? res.image_url.split("/").pop() : "") ||
          "",
      );
      setImagePreviewUrl(res.image_preview_url || null);
      setPendingFile(null);
      setLocalPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [source, safePart]);

  useEffect(() => {
    void load();
  }, [load]);

  const enterPreview = useCallback(() => setPreviewMode(true), []);
  useAutoStudentPreview({
    enabled: isBank,
    loading,
    onPreview: enterPreview,
  });

  useEffect(() => {
    setPreviewMode(false);
    setSaveMsg(null);
    setError(null);
    setPendingFile(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on part change
  }, [safePart]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  function onExamModuleChange(next: WritingExamModule) {
    setExamModule(next);
    if (safePart === 1) {
      const preferred = defaultTask1TypeForExamModule(next);
      if (
        (questionType === "task1_academic" && next === "general_training") ||
        (questionType === "task1_general" && next === "academic")
      ) {
        setQuestionType(preferred);
      }
    }
  }

  function onTask1TypeChange(next: "task1_academic" | "task1_general") {
    setQuestionType(next);
    if (next === "task1_general") {
      removeImage();
    }
  }

  function onFileChosen(file: File | null) {
    if (!file) return;
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
    setImageName(file.name);
  }

  function removeImage() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    setPendingFile(null);
    setImageKey("");
    setImageName("");
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImage() {
    if (!pendingFile) {
      setError("Choose an image first.");
      return;
    }
    setUploading(true);
    setError(null);
    setSaveMsg(null);
    try {
      const res =
        source.kind === "mock"
          ? await adminApi.uploadWritingImage(source.mockId, 1, pendingFile)
          : await adminApi.uploadBankWritingImage(source.setId, 1, pendingFile);
      setImageKey(res.image_url);
      setImageName(res.image_name || pendingFile.name);
      setImagePreviewUrl(res.image_preview_url || localPreviewUrl);
      setPendingFile(null);
      setSaveMsg("Image uploaded to R2 — save the task to attach it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!hasRichTextContent(prompt)) {
      setError("Add a prompt before saving.");
      return;
    }
    if (isBank) {
      if (!examModule) {
        setError("Select an Exam Module before saving.");
        return;
      }
      const mismatch = writingTaxonomyMismatchMessage(questionType, examModule);
      if (mismatch) {
        setError(mismatch);
        return;
      }
    }
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      // Upload pending local file before save if needed (Academic Task 1 only)
      let key = imageKey.trim();
      if (isTask1Academic && pendingFile) {
        const uploaded =
          source.kind === "mock"
            ? await adminApi.uploadWritingImage(source.mockId, 1, pendingFile)
            : await adminApi.uploadBankWritingImage(
                source.setId,
                1,
                pendingFile,
              );
        key = uploaded.image_url;
        setImageKey(uploaded.image_url);
        setImagePreviewUrl(uploaded.image_preview_url || localPreviewUrl);
        setImageName(uploaded.image_name || pendingFile.name);
        setPendingFile(null);
      }

      const saveBody = {
        prompt,
        question_type: questionType,
        options,
        // Empty string clears Task 1 image; null leaves existing (Task 2)
        image_url: safePart === 1 ? (isTask1General ? "" : key) : null,
        ...(isBank && examModule ? { exam_module: examModule } : {}),
      };
      const res =
        source.kind === "mock"
          ? await adminApi.saveWritingPart(source.mockId, safePart, saveBody)
          : await adminApi.saveBankWritingPart(source.setId, safePart, saveBody);
      setSaveMsg(`Saved Writing Task ${res.part}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#5A6B82]">Loading writing task…</p>;
  }

  if (previewMode) {
    return (
      <div className="pb-24">
        <AdminPageHeader
          eyebrow={eyebrow}
          title="Writing builder"
          actions={
            <Link href={backHref} className={cn("text-sm", adminLink)}>
              {backLabel}
            </Link>
          }
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-[#E6F6F8] px-3 py-1 font-mono text-xs font-semibold text-teal">
            Student preview
          </span>
          <span
            className={cn(
              "font-mono text-xs",
              promptReady ? "text-[#15935B]" : "text-[#94A3B8]",
            )}
          >
            {completionLabel}
          </span>
        </div>

        {maxTasks > 1 ? (
          <div className="mt-4 flex gap-2">
            {Array.from({ length: maxTasks }, (_, i) => i + 1).map((t) => (
              <Link
                key={t}
                href={builderPartHref(source, "writing", t, { preview: true })}
                className={cn(
                  "rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition-all",
                  t === safePart
                    ? "border-cyan bg-[#E6F6F8] text-teal"
                    : "border-[#E4E9F0] bg-white text-[#5A6B82] hover:border-cyan",
                )}
              >
                Task {t}
              </Link>
            ))}
          </div>
        ) : null}

        <div className={cn(adminCard, "mt-5 space-y-5")}>
          <div>
            <p className={adminMutedLabel}>
              {isTask1General
                ? "General Training Task 1 · Letter"
                : `Task ${safePart} prompt`}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">
              {richHtmlToPlainText(prompt) || "(no prompt yet)"}
            </p>
          </div>
          {isTask1Academic && displayImageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImageSrc}
              alt={imageName || "Task 1 figure"}
              className="max-h-[420px] w-full rounded-xl border border-[#EAEEF3] object-contain"
            />
          ) : null}
          <div className="rounded-xl border border-dashed border-[#D5DEE9] bg-[#F8FAFC] px-4 py-10 text-center text-sm text-[#94A3B8]">
            Student's response area
          </div>
        </div>

        <AdminBuilderStickyBar
          source={source}
          activeModule="writing"
          label={completionLabel}
          previewMode
          onTogglePreview={() => setPreviewMode(false)}
          onSave={() => void handleSave()}
          saving={saving}
          {...stickyReviewProps}
        />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <AdminPageHeader
        eyebrow={eyebrow}
        title="Writing builder"
        actions={
          <Link href={backHref} className={cn("text-sm", adminLink)}>
            {backLabel}
          </Link>
        }
      />

      {source.kind === "bank" ? (
        <AdminSetWatchVideoCard setId={source.setId} className="mt-5" />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {maxTasks > 1 ? (
          <div className="flex gap-2">
            {Array.from({ length: maxTasks }, (_, i) => i + 1).map((t) => (
              <Link
                key={t}
                href={builderPartHref(source, "writing", t)}
                className={cn(
                  "rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition-all",
                  t === safePart
                    ? "border-cyan bg-[#E6F6F8] text-teal"
                    : "border-[#E4E9F0] bg-white text-[#5A6B82] hover:border-cyan",
                )}
              >
                Task {t}
              </Link>
            ))}
          </div>
        ) : (
          <span className="text-sm font-semibold text-navy">Writing set</span>
        )}
        <span
          className={cn(
            "font-mono text-xs",
            promptReady ? "text-[#15935B]" : "text-[#94A3B8]",
          )}
        >
          {completionLabel}
        </span>
      </div>

      {error && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      )}
      {saveMsg && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveMsg}
        </div>
      )}

      {isBank ? (
        <div className={cn(adminCard, "mt-6")}>
          <h2 className={cn(adminHeading, "text-[17px]")}>Exam Module</h2>
          <p className={cn(adminSubtext, "mt-1")}>
            Explicit classification for the planner. Both = Academic and General
            Training (not duplicated content).
          </p>
          <div
            className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
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
                    name="writing_exam_module"
                    value={mod}
                    checked={active}
                    onChange={() => onExamModuleChange(mod)}
                    className="accent-cyan"
                  />
                  {EXAM_MODULE_LABELS[mod]}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {safePart === 1 ? (
        <div className={cn(adminCard, "mt-5")}>
          <h2 className={cn(adminHeading, "text-[17px]")}>Task 1 type</h2>
          <div
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            role="radiogroup"
            aria-label="Task 1 type"
          >
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[12px] border px-4 py-3 text-sm font-semibold transition-colors",
                isTask1Academic
                  ? "border-cyan bg-cyan-soft/40 text-navy ring-2 ring-cyan/25"
                  : "border-[#E4E9F0] bg-white text-[#5A6B82] hover:border-cyan/40",
              )}
            >
              <input
                type="radio"
                name="task1_type"
                value="task1_academic"
                checked={isTask1Academic}
                onChange={() => onTask1TypeChange("task1_academic")}
                className="accent-cyan"
              />
              Academic Task 1
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[12px] border px-4 py-3 text-sm font-semibold transition-colors",
                isTask1General
                  ? "border-cyan bg-cyan-soft/40 text-navy ring-2 ring-cyan/25"
                  : "border-[#E4E9F0] bg-white text-[#5A6B82] hover:border-cyan/40",
              )}
            >
              <input
                type="radio"
                name="task1_type"
                value="task1_general"
                checked={isTask1General}
                onChange={() => onTask1TypeChange("task1_general")}
                className="accent-cyan"
              />
              General Training Task 1 · Letter
            </label>
          </div>
        </div>
      ) : null}

      <div className={cn(adminCard, "mt-5")}>
        <h2 className={cn(adminHeading, "text-[17px]")}>
          {isTask1General
            ? "General Training Task 1 · Letter"
            : `Task ${safePart} prompt`}
        </h2>
        <div className="mt-3">
          <AdminInlineRichTextEditor
            value={prompt}
            onChange={setPrompt}
            rows={8}
            placeholder={placeholder}
          />
        </div>
      </div>

      {isTask1Academic && (
        <div className={cn(adminCard, "mt-5")}>
          <h2 className={cn(adminHeading, "text-[17px]")}>
            Chart / graph / diagram
          </h2>
          <p className="mt-1 text-sm text-[#5A6B82]">
            Optional image for Academic Task 1. Upload to R2, then Save to
            attach it to the question.
          </p>

          <AdminFileDropZone
            className="mt-4"
            disabled={uploading}
            hint="Drop an image here or click Choose image."
            onFile={(file) => onFileChosen(file)}
          >
            {displayImageSrc ? (
              <div className="mb-4 flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={displayImageSrc}
                  src={displayImageSrc}
                  alt={imageName || "Task 1 preview"}
                  className="max-h-[320px] w-full rounded-xl border border-[#EAEEF3] bg-white object-contain"
                />
                <p className="font-mono text-xs text-[#94A3B8]">
                  {imageName || "Attached figure"}
                  {imageKey ? ` · ${imageKey}` : " · local preview"}
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFileChosen(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(adminBtnSecondary, "gap-2")}
              >
                <ImagePlus className="size-4" />
                Choose image
              </button>
              <button
                type="button"
                disabled={uploading || !pendingFile}
                onClick={() => void uploadImage()}
                className={adminBtnPrimary}
              >
                {uploading ? "Uploading…" : "Upload to R2"}
              </button>
              {(imageKey || localPreviewUrl) && (
                <button
                  type="button"
                  onClick={removeImage}
                  className={cn(
                    adminBtnSecondary,
                    "gap-2 border-red-200 text-[#B4474B] hover:bg-red-50",
                  )}
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              )}
            </div>
          </AdminFileDropZone>

          {!displayImageSrc ? (
            <p className="mt-3 font-mono text-xs text-[#94A3B8]">
              {imageName || "No image selected"}
              {imageKey ? ` · ${imageKey}` : ""}
            </p>
          ) : null}
        </div>
      )}

      {isTask1General ? (
        <div className={cn(adminCard, "mt-5")}>
          <h2 className={cn(adminHeading, "text-[17px]")}>Letter</h2>
          <p className={cn(adminSubtext, "mt-1")}>
            General Training Task 1 is a letter prompt. No chart or diagram is
            required.
          </p>
        </div>
      ) : null}

      <AdminBuilderStickyBar
        source={source}
        activeModule="writing"
        label={completionLabel}
        previewMode={false}
        onTogglePreview={() => setPreviewMode(true)}
        onSave={() => void handleSave()}
        saving={saving}
        {...stickyReviewProps}
      />
    </div>
  );
}
