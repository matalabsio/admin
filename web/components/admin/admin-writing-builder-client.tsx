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
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminLink,
  adminMutedLabel,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

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

  const promptReady = prompt.trim().length > 0;
  const completionLabel = promptReady ? "Prompt added" : "No prompt";
  const displayImageSrc = localPreviewUrl || imagePreviewUrl;

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
    safePart === 1
      ? "Describe the chart/graph/diagram. Include timing guidance and the minimum word count…"
      : "Enter the Task 2 essay question…";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        source.kind === "mock"
          ? await adminApi.loadWritingPart(source.mockId, safePart)
          : await adminApi.loadBankWritingPart(source.setId, safePart);
      setPrompt(res.prompt || "");
      setQuestionType(
        res.question_type || (safePart === 1 ? "task1_academic" : "task2"),
      );
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
    if (!prompt.trim()) {
      setError("Add a prompt before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaveMsg(null);
    try {
      // Upload pending local file before save if needed
      let key = imageKey.trim();
      if (safePart === 1 && pendingFile) {
        const res =
          source.kind === "mock"
            ? await adminApi.uploadWritingImage(source.mockId, 1, pendingFile)
            : await adminApi.uploadBankWritingImage(source.setId, 1, pendingFile);
        key = res.image_url;
        setImageKey(res.image_url);
        setImagePreviewUrl(res.image_preview_url || localPreviewUrl);
        setImageName(res.image_name || pendingFile.name);
        setPendingFile(null);
      }

      const saveBody = {
        prompt: prompt.trim(),
        question_type: questionType,
        options,
        // Empty string clears Task 1 image; null leaves existing (Task 2)
        image_url: safePart === 1 ? key : null,
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
        <div className="mt-4 flex items-center justify-between">
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

        <div className={cn(adminCard, "mt-5 space-y-5")}>
          <div>
            <p className={adminMutedLabel}>Task {safePart} prompt</p>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">
              {prompt.trim() || "(no prompt yet)"}
            </p>
          </div>
          {safePart === 1 && displayImageSrc ? (
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

      <div className={cn(adminCard, "mt-6")}>
        <h2 className={cn(adminHeading, "text-[17px]")}>
          Task {safePart} prompt
        </h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          placeholder={placeholder}
          className={cn(adminInput, "mt-3 min-h-[180px] resize-y")}
        />
      </div>

      {safePart === 1 && (
        <div className={cn(adminCard, "mt-5")}>
          <h2 className={cn(adminHeading, "text-[17px]")}>
            Chart / graph / diagram
          </h2>
          <p className="mt-1 text-sm text-[#5A6B82]">
            Optional image for Task 1. Upload to R2, then Save to attach it to
            the question.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
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

          <p className="mt-3 font-mono text-xs text-[#94A3B8]">
            {imageName || "No image selected"}
            {imageKey ? ` · ${imageKey}` : ""}
          </p>

          {displayImageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImageSrc}
              alt={imageName || "Task 1 preview"}
              className="mt-4 max-h-[320px] rounded-xl border border-[#EAEEF3] object-contain"
            />
          ) : null}
        </div>
      )}

      <AdminBuilderStickyBar
        source={source}
        activeModule="writing"
        label={completionLabel}
        previewMode={false}
        onTogglePreview={() => setPreviewMode(true)}
        onSave={() => void handleSave()}
        saving={saving}
      />
    </div>
  );
}
