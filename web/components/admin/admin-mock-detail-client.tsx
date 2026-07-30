"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  Eye,
  Headphones,
  MessageSquare,
  PenTool,
} from "lucide-react";
import { AdminMockEditForm } from "@/components/admin/admin-mock-edit-form";
import {
  adminApi,
  type AdminMockDetail,
  type SectionStatus,
} from "@/lib/admin-api";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminInput,
  adminLink,
  adminMeta,
  adminMutedLabel,
  adminStatusBadgeStyles,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type Props = { mockId: string };

export function AdminMockDetailClient({ mockId }: Props) {
  const router = useRouter();
  const [mock, setMock] = useState<AdminMockDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMock(await adminApi.getMock(mockId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mock");
    }
  }, [mockId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sectionMap = useMemo(() => {
    const map = new Map<string, Map<number, SectionStatus>>();
    for (const mod of mock?.section_status ?? []) {
      map.set(
        mod.module,
        new Map(mod.sections.map((s) => [s.part, s])),
      );
    }
    return map;
  }, [mock?.section_status]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!mock) return <p className="text-gray-600">Loading…</p>;

  const listeningParts = mock.configured_listening_parts ?? 4;
  const readingPassages = mock.configured_reading_passages ?? 3;
  const blockers = mock.publish_blockers ?? [];
  const canPublish = blockers.length === 0;
  const testHref = mock.catalog_number ? `/test?test=${mock.catalog_number}` : "/test?test=1";

  const togglePublished = async () => {
    setBusy(true);
    setError(null);
    try {
      const nextStatus = mock.status === "published" ? "draft" : "published";
      await adminApi.patchMockStatus(mock.id, nextStatus);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleFree = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.patchMock(mock.id, { is_free: !mock.is_free });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Access update failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteMock = async () => {
    if (!mock) return;
    const ok = window.confirm(
      `Delete “${mock.title}” permanently?\n\nThis removes the mock and all its questions. This cannot be undone.`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteMock(mock.id);
      router.push("/admin/mocks");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/mocks" className={cn("inline-block text-sm", adminLink)}>
            ← Back to mocks
          </Link>
          <p className={cn(adminMutedLabel, "mt-3")}>
            {mock.catalog_number ? `Test ${mock.catalog_number}` : "Mock"}
          </p>
          <h1 className={cn(adminHeading, "mt-1 text-2xl sm:text-[2rem]")}>{mock.title}</h1>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link href={testHref} className={cn(adminBtnSecondary, "w-full sm:w-auto")}>
            <Eye className="mr-1.5 size-4" />
            Preview as student
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleFree()}
            className={cn(adminBtnSecondary, "w-full sm:w-auto")}
          >
            {mock.is_free ? "Mark as paid" : "Mark as free"}
          </button>
          <button
            type="button"
            disabled={busy || (!canPublish && mock.status !== "published")}
            onClick={() => void togglePublished()}
            className={cn(adminBtnPrimary, "w-full sm:w-auto")}
          >
            {mock.status === "published" ? "Unpublish" : "Publish"}
          </button>
          {mock.status === "draft" || mock.status === "archived" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void deleteMock()}
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-[11px] border border-[#FBCACA] bg-[#FFF2F2] px-4 py-2.5 text-sm font-bold text-[#B42318] transition-colors hover:bg-[#FEE2E2] disabled:opacity-60 sm:w-auto"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <p className={cn(adminMeta)}>
        Access:{" "}
        <span className="font-medium text-black">
          {mock.is_free ? "Free (no subscription)" : "Paid (subscription required)"}
        </span>
      </p>

      <AdminMockEditForm mock={mock} onSaved={() => void load()} />

      {mock.status !== "published" && blockers.length > 0 ? (
        <div
          className="rounded-2xl border border-warning/30 bg-warning/8 p-4"
          role="status"
        >
          <p className="text-sm font-semibold text-black">Not ready to publish</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {mock.status !== "published" && blockers.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          All configured sections are ready — you can publish this mock from the Mocks list.
        </div>
      ) : null}

      <div className={cn(adminCard, "space-y-6")}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#5A6B82]">
          <span className={adminMeta}>Status</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              adminStatusBadgeStyles[
                mock.status === "published"
                  ? "live"
                  : mock.status === "draft"
                    ? "draft"
                    : "archived"
              ],
            )}
          >
            {mock.status}
          </span>
          <span>· {mock.total_questions} questions</span>
          {mock.catalog_number ? <span>· Test {mock.catalog_number} slot</span> : null}
        </div>

        <ModuleSectionManager
          mockId={mockId}
          mock={mock}
          sectionMap={sectionMap}
          listeningParts={listeningParts}
          readingPassages={readingPassages}
        />

        <div className="space-y-3">
          <p className={adminMutedLabel}>Module summary</p>
          {mock.modules.map((m) => (
            <div key={m.module} className="flex items-center justify-between rounded-xl border border-[#EAEEF3] bg-white px-4 py-3">
              <h3 className="text-sm font-semibold capitalize text-navy">{m.module}</h3>
              <p className="text-sm text-[#5A6B82]">
                {m.question_count} questions · {m.duration_minutes} min ·{" "}
                <span className="font-mono">{m.parts.join(", ") || "—"}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href={`/admin/mocks/${mockId}/listening/1`}
            className={adminBtnPrimary}
          >
            Listening builder
          </Link>
          <Link
            href={`/admin/mocks/${mockId}/reading/1`}
            className={adminBtnSecondary}
          >
            Reading builder
          </Link>
          <Link
            href={`/admin/mocks/${mockId}/writing/1`}
            className={adminBtnSecondary}
          >
            Writing builder
          </Link>
          <Link
            href={`/admin/mocks/${mockId}/speaking/1`}
            className={adminBtnSecondary}
          >
            Speaking builder
          </Link>
          <Link href={`/admin/mocks/${mockId}/questions`} className={adminBtnSecondary}>
            Edit questions
          </Link>
        </div>
      </div>
    </div>
  );
}

const MODULE_OPTIONS = [
  { value: "listening", label: "Listening", icon: Headphones },
  { value: "reading", label: "Reading", icon: PenTool },
  { value: "writing", label: "Writing", icon: BookOpen },
  { value: "speaking", label: "Speaking", icon: MessageSquare },
] as const;

function ModuleSectionManager({
  mockId,
  mock,
  sectionMap,
  listeningParts,
  readingPassages,
}: {
  mockId: string;
  mock: AdminMockDetail;
  sectionMap: Map<string, Map<number, SectionStatus>>;
  listeningParts: number;
  readingPassages: number;
}) {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState<string>("listening");
  const writingTasks =
    typeof (mock as { configured_writing_tasks?: number }).configured_writing_tasks ===
    "number"
      ? (mock as { configured_writing_tasks: number }).configured_writing_tasks
      : 2;

  function onModuleChange(value: string) {
    setSelectedModule(value);
    if (value === "reading") {
      router.push(`/admin/mocks/${mockId}/reading/1`);
    }
    if (value === "listening") {
      router.push(`/admin/mocks/${mockId}/listening/1`);
    }
    if (value === "writing") {
      router.push(`/admin/mocks/${mockId}/writing/1`);
    }
    if (value === "speaking") {
      router.push(`/admin/mocks/${mockId}/speaking/1`);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className={cn(adminMutedLabel, "mb-2")}>Select module</p>
        <div className="relative inline-block w-full max-w-xs">
          <select
            value={selectedModule}
            onChange={(e) => onModuleChange(e.target.value)}
            className={cn(
              adminInput,
              "mt-0 appearance-none pr-10 font-semibold capitalize",
            )}
          >
            {MODULE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
        </div>
      </div>

      {selectedModule === "listening" && (
        <div>
          <h2 className={cn(adminHeading, "text-sm")}>Listening builder</h2>
          <p className="mt-1 text-sm text-gray-700">
            Opening the visual listening builder…
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: listeningParts }, (_, i) => i + 1).map((part) => (
              <SectionLink
                key={`l-${part}`}
                href={`/admin/mocks/${mockId}/listening/${part}`}
                label={`Listening — Part ${part}`}
                status={sectionMap.get("listening")?.get(part)}
                module="listening"
                icon={<Headphones className="size-4 text-cyan" />}
              />
            ))}
          </div>
        </div>
      )}

      {selectedModule === "reading" && (
        <div>
          <h2 className={cn(adminHeading, "text-sm")}>Reading builder</h2>
          <p className="mt-1 text-sm text-gray-700">
            Opening the visual reading builder…
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: readingPassages }, (_, i) => i + 1).map((part) => (
              <SectionLink
                key={`r-${part}`}
                href={`/admin/mocks/${mockId}/reading/${part}`}
                label={`Reading — Passage ${part}`}
                status={sectionMap.get("reading")?.get(part)}
                module="reading"
                icon={<PenTool className="size-4 text-cyan" />}
              />
            ))}
          </div>
        </div>
      )}

      {selectedModule === "writing" && (
        <div>
          <h2 className={cn(adminHeading, "text-sm")}>Writing builder</h2>
          <p className="mt-1 text-sm text-gray-700">
            Writing prompts are configured per task. Task 1 can include a chart
            image; Task 2 is the essay prompt.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: writingTasks }, (_, i) => i + 1).map((part) => (
              <SectionLink
                key={`w-${part}`}
                href={`/admin/mocks/${mockId}/writing/${part}`}
                label={`Writing — Task ${part}`}
                status={sectionMap.get("writing")?.get(part)}
                module="writing"
                icon={<BookOpen className="size-4 text-cyan" />}
              />
            ))}
          </div>
        </div>
      )}

      {selectedModule === "speaking" && (
        <div>
          <h2 className={cn(adminHeading, "text-sm")}>Speaking builder</h2>
          <p className="mt-1 text-sm text-gray-700">
            Add Part 1–3 prompts and short examiner videos (10–15s). Part 2
            requires a cue card and video.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[1, 2, 3].map((part) => (
              <SectionLink
                key={`s-${part}`}
                href={`/admin/mocks/${mockId}/speaking/${part}`}
                label={`Speaking — Part ${part}`}
                status={sectionMap.get("speaking")?.get(part)}
                module="speaking"
                icon={<MessageSquare className="size-4 text-cyan" />}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-[#5A6B82]">
            Human scoring lives in the{" "}
            <Link href="/admin/speaking" className={adminLink}>
              Speaking review queue
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function SectionLink({
  href,
  label,
  status,
  module,
  icon,
}: {
  href: string;
  label: string;
  status?: SectionStatus;
  module: "listening" | "reading" | "writing" | "speaking";
  icon: ReactNode;
}) {
  const ready =
    status &&
    status.question_count > 0 &&
    (module === "listening" || module === "speaking"
      ? status.has_audio
      : true);
  const partial =
    status &&
    status.question_count > 0 &&
    !ready &&
    (module === "listening" || module === "speaking");

  return (
    <Link
      href={href}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors duration-200",
        ready
          ? "border-emerald-200 bg-emerald-50 text-black hover:bg-emerald-100"
          : partial
            ? "border-amber-200 bg-amber-50 text-black hover:bg-amber-100"
            : "border-border bg-white text-ink hover:bg-surface",
      )}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
          ready && "bg-emerald-100 text-emerald-700",
          partial && "bg-amber-100 text-amber-700",
          !ready && !partial && "bg-cyan-soft text-slate",
        )}
      >
        {!status || status.question_count === 0
          ? "Empty"
          : ready
            ? `${status.question_count} Q`
            : module === "listening"
              ? "No audio"
              : module === "speaking"
                ? "No video"
                : `${status.question_count} Q`}
      </span>
    </Link>
  );
}
