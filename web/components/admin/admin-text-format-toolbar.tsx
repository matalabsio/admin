"use client";

import { useEffect, type RefObject } from "react";
import { cn } from "@/lib/utils";

type TargetInput = HTMLTextAreaElement | HTMLInputElement;

type Props = {
  targetRef: RefObject<TargetInput | null>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

type FormatKind = "bold" | "italic" | "underline";

function markers(kind: FormatKind): { open: string; close: string } {
  if (kind === "bold") return { open: "**", close: "**" };
  if (kind === "italic") return { open: "*", close: "*" };
  return { open: "__", close: "__" };
}

export function AdminTextFormatToolbar({
  targetRef,
  value,
  onChange,
  className,
}: Props) {
  const apply = (kind: FormatKind) => {
    const input = targetRef.current;
    if (!input) return;

    const { open, close } = markers(kind);
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${open}${selected}${close}${value.slice(end)}`;
    onChange(next);

    const hasSelection = start !== end;
    const caretStart = start + open.length;
    const caretEnd = hasSelection ? end + open.length : caretStart;
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(caretStart, caretEnd);
    }, 0);
  };

  useEffect(() => {
    const input = targetRef.current;
    if (!input) return;

    const onKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        apply("bold");
      } else if (key === "i") {
        event.preventDefault();
        apply("italic");
      } else if (key === "u") {
        event.preventDefault();
        apply("underline");
      }
    };

    input.addEventListener("keydown", onKeyDown);
    return () => input.removeEventListener("keydown", onKeyDown);
  }, [targetRef, value]);

  return (
    <div className={cn("mb-2 flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => apply("bold")}
        className="rounded-md border border-[#D5DCE6] bg-white px-2 py-1 text-xs font-bold text-navy hover:border-cyan"
        aria-label="Make selection bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => apply("italic")}
        className="rounded-md border border-[#D5DCE6] bg-white px-2 py-1 text-xs italic text-navy hover:border-cyan"
        aria-label="Make selection italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => apply("underline")}
        className="rounded-md border border-[#D5DCE6] bg-white px-2 py-1 text-xs underline text-navy hover:border-cyan"
        aria-label="Make selection underlined"
      >
        U
      </button>
    </div>
  );
}
