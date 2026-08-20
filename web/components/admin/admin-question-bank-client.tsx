"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Library, Trash2 } from "lucide-react";
import { adminApi, type QuestionBankSetItem } from "@/lib/admin-api";
import { AdminCreateQuestionBankSetForm } from "@/components/admin/admin-create-question-bank-set-form";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminHeading,
  adminLink,
  adminMutedLabel,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

const SKILLS = [
  { value: "listening", label: "Listening" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
] as const;

type Skill = (typeof SKILLS)[number]["value"];

type Props = {
  initialSkill?: string;
};

function normalizeSkill(raw?: string): Skill {
  const s = (raw || "listening").toLowerCase();
  if (s === "reading" || s === "writing" || s === "speaking") return s;
  return "listening";
}

function partLabel(skill: Skill, part: number): string {
  if (skill === "writing") return part === 1 ? "Writing" : `Task ${part}`;
  if (skill === "reading") return part === 1 ? "Reading" : `Passage ${part}`;
  if (skill === "listening") return part === 1 ? "Listening" : `Part ${part}`;
  return part === 1 ? "Speaking" : `Part ${part}`;
}

function formatCreatedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export function AdminQuestionBankClient({
  initialSkill = "listening",
}: Props) {
  const router = useRouter();
  const [skill, setSkill] = useState<Skill>(normalizeSkill(initialSkill));
  const [sets, setSets] = useState<QuestionBankSetItem[]>([]);
  const [practiceTotals, setPracticeTotals] = useState<Record<Skill, number>>({
    listening: 0,
    reading: 0,
    writing: 0,
    speaking: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSetIds, setExpandedSetIds] = useState<Record<string, boolean>>(
    {},
  );
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<QuestionBankSetItem | null>(
    null,
  );

  const syncUrl = useCallback(
    (nextSkill: Skill) => {
      const params = new URLSearchParams();
      params.set("skill", nextSkill);
      router.replace(`/admin/question-bank?${params.toString()}`, {
        scroll: false,
      });
    },
    [router],
  );

  const selectSkill = (next: Skill) => {
    setSkill(next);
    setShowCreate(false);
    setExpandedSetIds({});
    syncUrl(next);
  };

  const loadPracticeAll = useCallback(async (activeSkill: Skill) => {
    const results = await Promise.all(
      SKILLS.map(async (s) => {
        const res = await adminApi.listQuestionBank(s.value);
        return { skill: s.value, sets: res.sets } as const;
      }),
    );
    const active = results.find((r) => r.skill === activeSkill);
    setSets(active?.sets ?? []);
    setPracticeTotals(
      Object.fromEntries(
        results.map((r) => [
          r.skill,
          r.sets.filter((set) => set.status !== "archived").length,
        ]),
      ) as Record<Skill, number>,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadPracticeAll(skill);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load question bank",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skill, loadPracticeAll]);

  const setsNewestFirst = useMemo(() => {
    const sorted = [...sets].sort((a, b) => {
      const aTime = a.created_at ? Date.parse(a.created_at) : 0;
      const bTime = b.created_at ? Date.parse(b.created_at) : 0;
      if (bTime !== aTime) return bTime - aTime;
      if (b.bank_number !== a.bank_number) return b.bank_number - a.bank_number;
      return b.set_number - a.set_number;
    });
    if (showArchived) return sorted;
    return sorted.filter((s) => s.status !== "archived");
  }, [sets, showArchived]);

  const archivedCount = useMemo(
    () => sets.filter((s) => s.status === "archived").length,
    [sets],
  );

  const moduleTotals = useMemo(
    () =>
      SKILLS.map((s) => ({
        skill: s.value,
        label: s.label,
        count: practiceTotals[s.value] ?? 0,
      })),
    [practiceTotals],
  );

  const skillLabel = SKILLS.find((s) => s.value === skill)?.label ?? skill;

  const openCreate = () => {
    setShowCreate(true);
    syncUrl(skill);
  };

  const toggleSet = (id: string) => {
    setExpandedSetIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const requestDeleteCustomSet = (item: QuestionBankSetItem) => {
    const isCustom = item.is_custom || item.bank_number === 5;
    if (!isCustom || deletingSetId) return;
    setPendingDelete(item);
  };

  const confirmDeleteCustomSet = async () => {
    const item = pendingDelete;
    if (!item) return;
    setDeletingSetId(item.set_id);
    setError(null);
    try {
      await adminApi.deleteQuestionBankSet(item.set_id);
      setSets((prev) => prev.filter((s) => s.set_id !== item.set_id));
      setPracticeTotals((prev) => ({
        ...prev,
        [skill]: Math.max(
          0,
          (prev[skill] ?? 0) - (item.status === "archived" ? 0 : 1),
        ),
      }));
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete practice set");
    } finally {
      setDeletingSetId(null);
    }
  };

  const patchSetStatus = async (
    item: QuestionBankSetItem,
    next: "draft" | "published" | "archived",
  ) => {
    if (statusBusyId) return;
    setStatusBusyId(item.set_id);
    setError(null);
    try {
      const res = await adminApi.patchQuestionBankSetStatus(item.set_id, next);
      setSets((prev) =>
        prev.map((s) =>
          s.set_id === item.set_id ? { ...s, status: res.status } : s,
        ),
      );
      await loadPracticeAll(skill);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update practice set status",
      );
    } finally {
      setStatusBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminConfirmDialog
        open={pendingDelete != null}
        tone="danger"
        title={
          pendingDelete
            ? `Delete “${pendingDelete.title}”?`
            : "Delete practice set?"
        }
        description="This removes the set, hub, and all bank questions. This cannot be undone."
        confirmLabel="Delete set"
        cancelLabel="Keep set"
        busy={Boolean(pendingDelete && deletingSetId === pendingDelete.set_id)}
        onCancel={() => {
          if (!deletingSetId) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDeleteCustomSet()}
      />
      <AdminPageHeader
        title="Question bank"
        subtitle="Admin-uploaded practice sets for personalized plans. Full mock tests live in Mock library."
        actions={
          <>
            <Link
              href="/admin/question-bank/overview"
              className={cn(adminBtnSecondary, "w-full sm:w-auto")}
            >
              Overview
            </Link>
            <button
              type="button"
              onClick={() =>
                showCreate ? setShowCreate(false) : openCreate()
              }
              className={cn(
                showCreate ? adminBtnSecondary : adminBtnPrimary,
                "w-full sm:w-auto",
              )}
            >
              {showCreate ? "Cancel" : "Create practice set"}
            </button>
            <Link
              href="/admin/mocks"
              className={cn(adminBtnSecondary, "w-full sm:w-auto")}
            >
              Mock library
            </Link>
          </>
        }
      />

      {showCreate ? (
        <AdminCreateQuestionBankSetForm
          initialSkill={skill}
          onCancel={() => setShowCreate(false)}
          onCreated={({ set_id, skill: createdSkill }) => {
            setShowCreate(false);
            setSkill(normalizeSkill(createdSkill));
            router.push(`/admin/question-bank/${createdSkill}/${set_id}/1`);
          }}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {moduleTotals.map((item) => {
          const active = item.skill === skill;
          return (
            <button
              key={item.skill}
              type="button"
              onClick={() => selectSkill(item.skill)}
              className={cn(
                adminCard,
                "cursor-pointer text-left transition-colors",
                active
                  ? "border-cyan bg-cyan-soft/30 ring-2 ring-cyan/30"
                  : "hover:border-cyan/40 hover:bg-cyan-soft/10",
              )}
              aria-pressed={active}
            >
              <p className={adminMutedLabel}>{item.label}</p>
              <p className="mt-2 font-mono text-[28px] font-medium tabular-nums text-navy">
                {item.count.toLocaleString()}
              </p>
              <p className={cn(adminSubtext, "mt-1")}>practice sets</p>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className={cn(adminCard, "space-y-4")}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={cn(adminHeading, "text-lg")}>
              {skillLabel} · Practice sets
            </h2>
            <p className={cn(adminSubtext, "mt-1")}>
              Reusable sets for personalized plans — newest first. Create a set,
              upload questions, then publish.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {archivedCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className={cn(adminBtnSecondary, "text-sm")}
              >
                {showArchived
                  ? "Hide archived"
                  : `Show archived (${archivedCount})`}
              </button>
            ) : null}
            {!showCreate ? (
              <button
                type="button"
                onClick={openCreate}
                className={cn(adminBtnPrimary, "text-sm")}
              >
                Create {skillLabel} set
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className={adminSubtext}>Loading {skillLabel.toLowerCase()}…</p>
        ) : setsNewestFirst.length === 0 ? (
          <div className="py-10 text-center">
            <Library className="mx-auto size-8 text-ink/25" strokeWidth={1.5} />
            <p className={cn(adminHeading, "mt-3 text-base")}>
              {sets.length > 0
                ? `No active ${skillLabel} sets`
                : `No ${skillLabel} practice sets yet`}
            </p>
            <p className={cn(adminSubtext, "mx-auto mt-1 max-w-md")}>
              {sets.length > 0
                ? `${archivedCount} archived empty shell(s) are hidden. Show archived, or create a new set and add questions.`
                : `Create a set, then add audio/video and questions in the ${skillLabel} builder.`}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {archivedCount > 0 && !showArchived ? (
                <button
                  type="button"
                  onClick={() => setShowArchived(true)}
                  className={cn(adminBtnSecondary)}
                >
                  Show archived ({archivedCount})
                </button>
              ) : null}
              {!showCreate ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className={cn(adminBtnPrimary)}
                >
                  Create {skillLabel} set
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {setsNewestFirst.map((item) => {
              const open = expandedSetIds[item.set_id] ?? false;
              const isCustom = item.is_custom || item.bank_number === 5;
              const createdLabel = formatCreatedAt(item.created_at);
              return (
                <li
                  key={item.set_id}
                  className="rounded-[14px] border border-[#EAEEF3] bg-[#FBFCFE]"
                >
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSet(item.set_id)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left hover:bg-white/70"
                      aria-expanded={open}
                    >
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-navy">
                        {open ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn(adminMutedLabel, "block")}>
                          {isCustom ? (
                            <>
                              Custom · Set {item.set_number}
                              {item.status === "archived" ? " · Archived" : ""}
                            </>
                          ) : (
                            <>
                              Bank {item.bank_number}.{item.set_number}
                              {item.status === "archived" ? " · Archived" : ""}
                            </>
                          )}
                        </span>
                        <span className="block truncate text-[14px] font-semibold text-navy">
                          {item.title}
                        </span>
                        <span className={cn(adminSubtext, "mt-0.5 block text-[12px]")}>
                          {item.total_questions} questions · {item.status}
                          {createdLabel ? ` · Created ${createdLabel}` : ""}
                        </span>
                      </span>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.status !== "archived" ? (
                        <button
                          type="button"
                          disabled={statusBusyId === item.set_id}
                          onClick={() =>
                            void patchSetStatus(
                              item,
                              item.status === "published" ? "draft" : "published",
                            )
                          }
                          className={cn(adminBtnSecondary, "text-sm")}
                        >
                          {item.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      ) : null}
                      {isCustom ? (
                        <button
                          type="button"
                          disabled={deletingSetId === item.set_id}
                          onClick={() => requestDeleteCustomSet(item)}
                          className={cn(
                            adminBtnSecondary,
                            "inline-flex items-center gap-1 text-sm text-rose-700",
                          )}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      ) : item.status !== "archived" ? (
                        <button
                          type="button"
                          disabled={statusBusyId === item.set_id}
                          onClick={() => void patchSetStatus(item, "archived")}
                          className={cn(adminBtnSecondary, "text-sm")}
                        >
                          Archive
                        </button>
                      ) : null}
                      <Link
                        href={`/admin/question-bank/${skill}/${item.set_id}/1`}
                        className={cn(
                          adminLink,
                          "inline-flex items-center gap-1 text-sm",
                        )}
                      >
                        Edit set
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  </div>
                  {open ? (
                    <div className="flex flex-wrap gap-2 border-t border-[#EDF1F6] px-4 py-3">
                      {item.sections.map((sec) => (
                        <Link
                          key={sec.part}
                          href={`/admin/question-bank/${skill}/${item.set_id}/${sec.part}`}
                          className={cn(
                            "inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition",
                            sec.has_content
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-border-soft bg-white text-ink/70 hover:bg-ink/[0.03]",
                          )}
                        >
                          {partLabel(skill, sec.part)}
                          <span className="ml-1.5 text-xs opacity-70">
                            {sec.question_count}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
