import { Loader2 } from "lucide-react";
import { adminStatusBadgeStyles } from "@/components/admin/admin-ui";
import type { StreamStatusKind } from "@/lib/stream-ready";
import { cn } from "@/lib/utils";

export function AdminStreamUploadStatus({
  phase,
  progress,
  fileName,
}: {
  phase: "idle" | "uploading" | "processing";
  progress: number;
  fileName?: string | null;
}) {
  const pct =
    phase === "idle" ? 0 : Math.min(100, Math.max(0, Math.round(progress)));
  const label =
    phase === "processing"
      ? "Processing on Stream…"
      : phase === "uploading"
        ? `Uploading · ${pct}%`
        : fileName
          ? "Ready to upload"
          : "Waiting for a video";

  return (
    <div className="mt-5" aria-live="polite">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="inline-flex min-w-0 items-center gap-2 font-mono text-xs font-semibold text-[#5A6B82]">
          {phase === "uploading" || phase === "processing" ? (
            <Loader2 className="size-3.5 shrink-0 motion-safe:animate-spin" aria-hidden />
          ) : null}
          <span className="truncate">{label}</span>
        </p>
        <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-navy">
          {pct}%
        </p>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-[#EEF2F6]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Upload progress"
      >
        <div
          className={cn(
            "h-full rounded-full bg-cyan motion-reduce:transition-none",
            phase === "idle" ? "" : "transition-[width] duration-200",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AdminStreamStatusBadge({
  kind,
  busy = false,
}: {
  kind: StreamStatusKind;
  busy?: boolean;
}) {
  if (busy || kind === "processing") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
          adminStatusBadgeStyles.pending,
        )}
      >
        <Loader2 className="size-3 motion-safe:animate-spin" aria-hidden />
        Processing
      </span>
    );
  }
  if (kind === "ready") {
    return (
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
          adminStatusBadgeStyles.live,
        )}
      >
        Ready
      </span>
    );
  }
  if (kind === "error") {
    return (
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
          adminStatusBadgeStyles.inactive,
        )}
      >
        Error
      </span>
    );
  }
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
        adminStatusBadgeStyles.archived,
      )}
    >
      Empty
    </span>
  );
}
