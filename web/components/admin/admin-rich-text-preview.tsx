"use client";

import { cn } from "@/lib/utils";
import { toCanonicalRichHtml } from "@/lib/rich-text-html";

type Props = {
  value: string;
  className?: string;
  emptyLabel?: string;
};

export function AdminRichTextPreview({
  value,
  className,
  emptyLabel = "Formatting preview appears here.",
}: Props) {
  const text = value.trim();
  if (!text) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[#E8EEF5] bg-[#FAFCFF] px-4 py-3 text-[13px] text-[#93A3B8]",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  const html = toCanonicalRichHtml(text);
  return (
    <div
      className={cn(
        "admin-rich-html text-[14px] font-normal leading-relaxed text-[#25364D]",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
