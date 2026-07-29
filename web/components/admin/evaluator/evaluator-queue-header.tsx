"use client";

import Link from "next/link";
import {
  adminFilterPill,
  adminFilterPillActive,
  adminMeta,
  adminHeading,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type EvaluatorModule = "speaking" | "writing" | "diagnostics";

type Props = {
  pendingCount: number;
  activeModule: EvaluatorModule;
  title?: string;
  subtitle?: string;
};

export function EvaluatorQueueHeader({
  pendingCount,
  activeModule,
  title = "Evaluator portal",
  subtitle,
}: Props) {
  const moduleSubtitle =
    subtitle ??
    (activeModule === "speaking"
      ? "Speaking review"
      : activeModule === "writing"
        ? "Writing review"
        : "Diagnostic test review");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/speaking"
          className={cn(
            adminFilterPill,
            activeModule === "speaking" && adminFilterPillActive,
          )}
        >
          Speaking
        </Link>
        <Link
          href="/admin/writing"
          className={cn(
            adminFilterPill,
            activeModule === "writing" && adminFilterPillActive,
          )}
        >
          Writing
        </Link>
        <Link
          href="/admin/diagnostics"
          className={cn(
            adminFilterPill,
            activeModule === "diagnostics" && adminFilterPillActive,
          )}
        >
          Diagnostics
        </Link>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={adminMeta}>{moduleSubtitle}</p>
          <h2 className={cn(adminHeading, "text-2xl")}>{title}</h2>
        </div>
        {pendingCount > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-cyan-soft px-3 py-1.5 text-xs font-bold text-teal">
            <span className="size-2 rounded-full bg-cyan" aria-hidden />
            {pendingCount} in queue
          </span>
        ) : null}
      </div>
    </div>
  );
}
