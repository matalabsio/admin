"use client";

import {
  evaluatorBody,
  evaluatorCard,
  evaluatorCardPad,
  evaluatorMeta,
  evaluatorTitle,
} from "@/components/admin/evaluator/evaluator-ui";
import { cn } from "@/lib/utils";

type Props = {
  activePart: number;
  onPartChange?: (part: number) => void;
  responseCounts?: Partial<Record<number, number>>;
};

const PARTS = [1, 2, 3];

export function EvaluatorPartTabs({
  activePart,
  onPartChange,
  responseCounts,
}: Props) {
  return (
    <div
      className="flex border-b border-[#EAEEF3]"
      role="tablist"
      aria-label="Speaking parts"
    >
      {PARTS.map((part) => {
        const active = part === activePart;
        return (
          <button
            key={part}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`speaking-part-${part}`}
            id={`speaking-part-tab-${part}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onPartChange?.(part)}
            onKeyDown={(event) => {
              const keyToPart: Partial<Record<string, number>> = {
                ArrowLeft: part === 1 ? 3 : part - 1,
                ArrowRight: part === 3 ? 1 : part + 1,
                Home: 1,
                End: 3,
              };
              const nextPart = keyToPart[event.key];
              if (!nextPart) return;
              event.preventDefault();
              onPartChange?.(nextPart);
              document
                .getElementById(`speaking-part-tab-${nextPart}`)
                ?.focus();
            }}
            className={cn(
              "cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors focus-visible:rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan sm:px-[18px]",
              active
                ? "border-b-[2.5px] border-cyan font-bold text-navy"
                : "text-[#94A3B8] hover:text-[#5A6B82]",
            )}
          >
            Part {part}
            {responseCounts?.[part] != null ? (
              <span className="ml-1.5 font-mono text-[10px] text-[#64748B]">
                ({responseCounts[part]})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function parseCueBullets(cueCard: string): string[] {
  const lines = cueCard
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines
    .map((l) => l.replace(/^[-•*]\s*/, ""))
    .filter((l) => l.length > 0);
}

export function EvaluatorCueCard({
  title,
  cueCard,
  transcript,
}: {
  title?: string | null;
  cueCard?: string | null;
  transcript?: string | null;
}) {
  const body = cueCard?.trim() || transcript?.trim();
  if (!title && !body) return null;

  const bullets = cueCard ? parseCueBullets(cueCard) : [];
  const hasBullets = bullets.length > 0;

  return (
    <section className={cn(evaluatorCard, evaluatorCardPad)}>
      <p className={evaluatorMeta}>Cue card shown to student</p>
      {title ? (
        <h3 className={cn(evaluatorTitle, "mt-2 text-lg leading-snug")}>
          {title}
        </h3>
      ) : null}
      {hasBullets ? (
        <>
          <p className={cn(evaluatorBody, "mt-3")}>You should say:</p>
          <ul className="mt-2 flex flex-col gap-1 pl-[18px]">
            {bullets.map((item) => (
              <li key={item} className={evaluatorBody}>
                {item}
              </li>
            ))}
          </ul>
        </>
      ) : body ? (
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm font-light leading-relaxed text-[#5A6B82]">
          {body}
        </pre>
      ) : null}
    </section>
  );
}
