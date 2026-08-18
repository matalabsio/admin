"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { adminMeta } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function AdminFileDropZone({
  onFile,
  disabled = false,
  hint = "Drop a file here or click Choose",
  className,
  children,
}: Props) {
  const [dragOver, setDragOver] = useState(false);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragOver(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) onFile(file);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed p-3 transition-colors",
        dragOver ? "border-cyan bg-[#F2FBFD]" : "border-[#E4E9F0] bg-[#FBFCFE]",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {hint ? <p className={cn(adminMeta, "mt-2")}>{hint}</p> : null}
    </div>
  );
}
