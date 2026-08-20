"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Pencil, Save } from "lucide-react";
import {
  type BuilderSkill,
  type BuilderSource,
  builderModuleHref,
} from "@/components/admin/admin-builder-source";
import { adminBtnPrimary } from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

const MODULES: { id: BuilderSkill; label: string }[] = [
  { id: "listening", label: "Listening" },
  { id: "reading", label: "Reading" },
  { id: "writing", label: "Writing" },
  { id: "speaking", label: "Speaking" },
];

type Props = {
  source: BuilderSource;
  activeModule: BuilderSkill;
  label: string;
  previewMode: boolean;
  onTogglePreview: () => void;
  onSave: () => void;
  saving: boolean;
  previewDisabled?: boolean;
  saveDisabled?: boolean;
  reviewNavLabel?: string | null;
  prevReviewHref?: string | null;
  nextReviewHref?: string | null;
};

export function AdminBuilderStickyBar({
  source,
  activeModule,
  label,
  previewMode,
  onTogglePreview,
  onSave,
  saving,
  previewDisabled = false,
  saveDisabled = false,
  reviewNavLabel = null,
  prevReviewHref = null,
  nextReviewHref = null,
}: Props) {
  const modules =
    source.kind === "bank"
      ? MODULES.filter((m) => m.id === source.skill)
      : MODULES;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy/95 px-4 py-3 backdrop-blur sm:px-8">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <nav
            aria-label="Module"
            className="flex flex-wrap items-center gap-1.5"
          >
            {modules.map((mod, index) => {
              const active = mod.id === activeModule;
              return (
                <span key={mod.id} className="flex items-center gap-1.5">
                  {index > 0 ? (
                    <span
                      aria-hidden
                      className="font-mono text-[10px] text-white/30"
                    >
                      →
                    </span>
                  ) : null}
                  <Link
                    href={builderModuleHref(source, mod.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                      active
                        ? "bg-cyan text-navy"
                        : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {mod.label}
                  </Link>
                </span>
              );
            })}
          </nav>
          <span className="truncate font-mono text-[12px] text-[#7689A0]">
            {reviewNavLabel ? `${reviewNavLabel} · ` : ""}
            {label}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {prevReviewHref || nextReviewHref ? (
            <div className="flex items-center gap-1">
              {prevReviewHref ? (
                <Link
                  href={prevReviewHref}
                  className="flex items-center gap-1 rounded-[11px] border-[1.5px] border-white/20 px-2.5 py-2 text-sm font-semibold text-white hover:border-white/40 sm:px-3 sm:py-2.5"
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Link>
              ) : (
                <span
                  aria-hidden
                  className="flex items-center gap-1 rounded-[11px] border-[1.5px] border-white/10 px-2.5 py-2 text-sm font-semibold text-white/30 sm:px-3 sm:py-2.5"
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">Previous</span>
                </span>
              )}
              {nextReviewHref ? (
                <Link
                  href={nextReviewHref}
                  className="flex items-center gap-1 rounded-[11px] border-[1.5px] border-white/20 px-2.5 py-2 text-sm font-semibold text-white hover:border-white/40 sm:px-3 sm:py-2.5"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span
                  aria-hidden
                  className="flex items-center gap-1 rounded-[11px] border-[1.5px] border-white/10 px-2.5 py-2 text-sm font-semibold text-white/30 sm:px-3 sm:py-2.5"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="size-4" />
                </span>
              )}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onTogglePreview}
            disabled={previewDisabled}
            className={cn(
              "flex items-center gap-2 rounded-[11px] border-[1.5px] border-white/20 bg-transparent px-3 py-2 text-sm font-semibold text-white hover:border-white/40 sm:px-4 sm:py-2.5",
              previewDisabled && "cursor-not-allowed opacity-40 hover:border-white/20",
            )}
          >
            {previewMode ? (
              <Pencil className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {previewMode ? "Back to builder" : "Preview as Student"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || saveDisabled}
            className={cn(adminBtnPrimary, "gap-2")}
          >
            <Save className="size-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
