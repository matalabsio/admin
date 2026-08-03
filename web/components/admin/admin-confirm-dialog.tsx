"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminHeading,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  tone = "default",
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => cancelRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const isDanger = tone === "danger";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-navy/45 backdrop-blur-[2px] transition-opacity"
        aria-label="Close dialog"
        disabled={busy}
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-[81] w-full max-w-md overflow-hidden rounded-[18px] border border-[#EAEEF3] bg-white shadow-[0_24px_60px_rgba(13,31,60,0.22)]"
      >
        <div className="flex items-start gap-3 border-b border-[#EDF1F6] px-5 py-4">
          <span
            className={cn(
              "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full",
              isDanger ? "bg-rose-50 text-rose-700" : "bg-cyan-soft/50 text-navy",
            )}
            aria-hidden
          >
            <AlertTriangle className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className={cn(adminHeading, "text-lg leading-snug")}>
              {title}
            </h2>
            <p id={descriptionId} className={cn(adminSubtext, "mt-1.5")}>
              {description}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-[#F1F4F8] hover:text-navy disabled:opacity-50"
            aria-label="Close"
            disabled={busy}
            onClick={onCancel}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4">
          <button
            type="button"
            ref={cancelRef}
            className={cn(adminBtnSecondary, "min-w-[96px]")}
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              adminBtnPrimary,
              "min-w-[96px]",
              isDanger &&
                "bg-rose-600 text-white shadow-[0_10px_24px_rgba(225,29,72,0.28)] hover:bg-rose-700",
            )}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
