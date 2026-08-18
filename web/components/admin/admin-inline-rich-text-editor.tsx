"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { normalizeClipboardToRichHtml, toCanonicalRichHtml } from "@/lib/rich-text-html";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
};

export function AdminInlineRichTextEditor({
  value,
  onChange,
  placeholder = "Write here…",
  rows = 6,
  className,
}: Props) {
  const initial = useMemo(() => toCanonicalRichHtml(value), [value]);
  const minHeightPx = Math.max(96, rows * 24);
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: false })],
    content: initial,
    onCreate({ editor: created }) {
      editorRef.current = created;
    },
    onDestroy() {
      editorRef.current = null;
    },
    editorProps: {
      attributes: {
        class:
          "admin-rich-editor min-h-[96px] w-full rounded-xl border border-[#D5DCE6] bg-white px-3.5 py-2.5 text-[14.5px] leading-relaxed text-navy outline-none focus:border-cyan",
      },
      handlePaste(_view, event) {
        const html = event.clipboardData?.getData("text/html") ?? "";
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const nextHtml = normalizeClipboardToRichHtml({ html, text });
        if (!nextHtml || nextHtml === "<p></p>") return false;
        event.preventDefault();
        editorRef.current?.chain().focus().insertContent(nextHtml).run();
        return true;
      },
    },
    onUpdate({ editor: current }) {
      onChange(current.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = toCanonicalRichHtml(value);
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[#D5DCE6] bg-white px-3.5 py-2.5 text-[14px] text-[#94A3B8]",
          className,
        )}
        style={{ minHeight: `${minHeightPx}px` }}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="rounded-md border border-[#D5DCE6] bg-white px-2 py-1 text-xs font-bold text-navy hover:border-cyan"
          aria-label="Make selection bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="rounded-md border border-[#D5DCE6] bg-white px-2 py-1 text-xs italic text-navy hover:border-cyan"
          aria-label="Make selection italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className="rounded-md border border-[#D5DCE6] bg-white px-2 py-1 text-xs underline text-navy hover:border-cyan"
          aria-label="Make selection underlined"
        >
          U
        </button>
      </div>
      <div style={{ minHeight: `${minHeightPx}px` }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
