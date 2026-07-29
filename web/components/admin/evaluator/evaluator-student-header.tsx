"use client";

import {
  evaluatorAvatar,
  evaluatorBody,
  evaluatorCard,
  evaluatorCardPad,
  evaluatorMeta,
  evaluatorQueueBadge,
} from "@/components/admin/evaluator/evaluator-ui";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  email?: string | null;
  submittedAt: string;
};

function formatSubmitted(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch {
    return null;
  }
}

export function EvaluatorStudentHeader({
  name,
  email,
  submittedAt,
}: Props) {
  const relative = formatRelative(submittedAt);

  return (
    <section className={cn(evaluatorCard, evaluatorCardPad)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className={evaluatorAvatar}>
            {(name.slice(0, 2) || "ST").toUpperCase()}
          </span>
          <p className={evaluatorMeta}>Student</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-navy sm:text-[1.65rem]">
            {name}
          </h2>
          {email ? (
            <p className={cn(evaluatorBody, "mt-1")}>{email}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className={evaluatorMeta}>Submitted</p>
          <p className="mt-1 text-sm font-semibold text-navy">
            {relative ?? formatSubmitted(submittedAt)}
          </p>
          <p className="mt-0.5 text-xs text-[#94A3B8]">
            {formatSubmitted(submittedAt)}
          </p>
        </div>
      </div>
    </section>
  );
}

export function EvaluatorQueueBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className={evaluatorQueueBadge}>
      <span className="size-1.5 rounded-full bg-cyan" aria-hidden />
      {count} in queue
    </span>
  );
}
