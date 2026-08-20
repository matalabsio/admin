"use client";

import { useEffect, useState } from "react";
import {
  adminApi,
  type BankListeningPartResponse,
  type BankReadingPartResponse,
  type BankSpeakingPartResponse,
  type BankWritingPartResponse,
  type QuestionBankSetItem,
} from "@/lib/admin-api";
import { AdminRichTextPreview } from "@/components/admin/admin-rich-text-preview";
import { adminInput, adminMutedLabel, adminSubtext } from "@/components/admin/admin-ui";
import { richHtmlToPlainText } from "@/lib/rich-text-html";
import { cn } from "@/lib/utils";

type Skill = "listening" | "reading" | "writing" | "speaking";

type Props = {
  skill: Skill;
  item: QuestionBankSetItem;
  part: number;
};

function partLabel(skill: Skill, part: number): string {
  if (skill === "writing") return `Task ${part}`;
  if (skill === "reading") return `Passage ${part}`;
  if (skill === "listening") return `Part ${part}`;
  return `Part ${part}`;
}

function isCheckboxType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes("checkbox") || t.includes("choose") || t.includes("matching");
}

function QuestionOptions({
  type,
  options,
}: {
  type: string;
  options?: Array<{ label: string; text: string }> | null;
}) {
  if (!options?.length) {
    return (
      <input
        type="text"
        placeholder="Type your answer…"
        disabled
        className={cn(adminInput, "max-w-sm")}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <label
          key={`${option.label}-${option.text}`}
          className="flex items-center gap-2.5 text-sm text-[#28374E]"
        >
          <input
            type={isCheckboxType(type) ? "checkbox" : "radio"}
            disabled
            className="size-4 accent-cyan"
          />
          {option.label}
          {option.text ? `. ${option.text}` : ""}
        </label>
      ))}
    </div>
  );
}

function ListeningPreview({ data, setId }: { data: BankListeningPartResponse; setId: string }) {
  const audioSrc = data.audio_key
    ? adminApi.bankListeningPlayUrl(setId, data.part, data.audio_key)
    : null;
  return (
    <div>
      {audioSrc ? (
        <audio key={audioSrc} controls className="mb-5 w-full max-w-md" src={audioSrc}>
          <track kind="captions" />
        </audio>
      ) : (
        <p className={cn(adminSubtext, "mb-5")}>No audio attached yet.</p>
      )}
      {data.questions.length === 0 ? (
        <p className={adminSubtext}>No questions added yet.</p>
      ) : null}
      {data.questions.map((q) => (
        <div key={q.id} className="mb-5 border-b border-[#EEF1F5] pb-5 last:mb-0 last:border-b-0 last:pb-0">
          <p className="mb-1.5 font-mono text-xs text-[#94A3B8]">
            Q{q.question_number} · {q.question_type}
          </p>
          <div className="mb-3">
            <AdminRichTextPreview
              value={q.prompt}
              emptyLabel="(no question text)"
              className="border-0 bg-transparent p-0"
            />
          </div>
          <QuestionOptions type={q.question_type} options={q.options} />
        </div>
      ))}
    </div>
  );
}

function ReadingPreview({ data }: { data: BankReadingPartResponse }) {
  return (
    <div>
      <div className="mb-6">
        <AdminRichTextPreview
          value={data.passage_text}
          emptyLabel="(no passage added yet)"
          className="border-0 bg-transparent p-0"
        />
      </div>
      {data.questions.length === 0 ? (
        <p className={adminSubtext}>No questions added yet.</p>
      ) : null}
      {data.questions.map((q) => (
        <div key={q.id} className="mb-5 border-b border-[#EEF1F5] pb-5 last:mb-0 last:border-b-0 last:pb-0">
          <p className="mb-1.5 font-mono text-xs text-[#94A3B8]">
            Q{q.question_number} · {q.question_type}
          </p>
          <div className="mb-3">
            <AdminRichTextPreview
              value={q.prompt}
              emptyLabel="(no question text)"
              className="border-0 bg-transparent p-0"
            />
          </div>
          <QuestionOptions type={q.question_type} options={q.options} />
        </div>
      ))}
    </div>
  );
}

function WritingPreview({ data, setId }: { data: BankWritingPartResponse; setId: string }) {
  const imageSrc =
    data.image_preview_url ||
    (data.image_url ? adminApi.bankWritingImagePlayUrl(setId, data.part, data.image_url) : null);
  return (
    <div className="space-y-5">
      <div>
        <p className={adminMutedLabel}>Task {data.part} prompt</p>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-navy">
          {richHtmlToPlainText(data.prompt) || "(no prompt yet)"}
        </p>
      </div>
      {data.part === 1 && imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt="Task 1 figure"
          className="max-h-[360px] w-full rounded-xl border border-[#EAEEF3] object-contain"
        />
      ) : null}
      <div className="rounded-xl border border-dashed border-[#D5DEE9] bg-[#F8FAFC] px-4 py-10 text-center text-sm text-[#94A3B8]">
        Student's response area
      </div>
    </div>
  );
}

function SpeakingPreview({ data }: { data: BankSpeakingPartResponse }) {
  if (data.questions.length === 0) {
    return <p className={adminSubtext}>No questions added yet.</p>;
  }
  return (
    <div className="space-y-5">
      {data.questions.map((q) => (
        <div key={q.id} className="border-b border-[#EEF1F5] pb-5 last:border-b-0 last:pb-0">
          <p className="mb-2 font-mono text-xs text-[#94A3B8]">
            Q{q.question_number} · {q.speak_time_sec}s
          </p>
          {q.video_preview_url ? (
            <video
              src={q.video_preview_url}
              className="mb-3 aspect-video w-full max-w-lg rounded-xl bg-black object-contain"
              controls
              playsInline
            />
          ) : (
            <div className="mb-3 flex aspect-video max-w-lg items-center justify-center rounded-xl bg-[#0D1F3C] text-sm text-white/50">
              No video for this question
            </div>
          )}
          {richHtmlToPlainText(q.prompt) ? (
            <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-navy">
              {richHtmlToPlainText(q.prompt)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AdminQuestionBankSetPreview({ skill, item, part }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState<BankListeningPartResponse | null>(null);
  const [reading, setReading] = useState<BankReadingPartResponse | null>(null);
  const [writing, setWriting] = useState<BankWritingPartResponse | null>(null);
  const [speaking, setSpeaking] = useState<BankSpeakingPartResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setListening(null);
    setReading(null);
    setWriting(null);
    setSpeaking(null);

    const load = async () => {
      try {
        if (skill === "listening") {
          const res = await adminApi.loadBankListeningPart(item.set_id, part);
          if (!cancelled) setListening(res);
        } else if (skill === "reading") {
          const res = await adminApi.loadBankReadingPart(item.set_id, part);
          if (!cancelled) setReading(res);
        } else if (skill === "writing") {
          const res = await adminApi.loadBankWritingPart(item.set_id, part);
          if (!cancelled) setWriting(res);
        } else {
          const res = await adminApi.loadBankSpeakingPart(item.set_id, part);
          if (!cancelled) setSpeaking(res);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load student preview");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [skill, item.set_id, part]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#E6F6F8] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-teal">
          Student preview · {partLabel(skill, part)}
        </span>
      </div>
      {loading ? <p className={adminSubtext}>Loading student preview…</p> : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {!loading && !error && skill === "listening" && listening ? (
        <ListeningPreview data={listening} setId={item.set_id} />
      ) : null}
      {!loading && !error && skill === "reading" && reading ? (
        <ReadingPreview data={reading} />
      ) : null}
      {!loading && !error && skill === "writing" && writing ? (
        <WritingPreview data={writing} setId={item.set_id} />
      ) : null}
      {!loading && !error && skill === "speaking" && speaking ? (
        <SpeakingPreview data={speaking} />
      ) : null}
    </div>
  );
}
