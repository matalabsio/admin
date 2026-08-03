"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Library, Trash2 } from "lucide-react";
import {
  adminApi,
  type AdminMockListItem,
  type QuestionBankSetItem,
} from "@/lib/admin-api";
import { AdminCreateQuestionBankSetForm } from "@/components/admin/admin-create-question-bank-set-form";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminFilterPill,
  adminFilterPillActive,
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
type Tab = "mocks" | "practice";

type Props = {
  initialSkill?: string;
  initialTab?: string;
};

function normalizeSkill(raw?: string): Skill {
  const s = (raw || "listening").toLowerCase();
  if (s === "reading" || s === "writing" || s === "speaking") return s;
  return "listening";
}

function normalizeTab(raw?: string): Tab {
  return raw === "mocks" ? "mocks" : "practice";
}

function sumMockModuleQuestions(mocks: AdminMockListItem[], module: string): number {
  return mocks.reduce((sum, mock) => {
    const mod = mock.modules.find((m) => m.module === module);
    return sum + (mod?.question_count ?? 0);
  }, 0);
}

function liveMocksOnly(mocks: AdminMockListItem[]): AdminMockListItem[] {
  return mocks.filter((m) => m.is_published && m.catalog_number != null);
}

function partLabel(skill: Skill, part: number): string {
  if (skill === "writing") return `Task ${part}`;
  if (skill === "reading") return `Passage ${part}`;
  return `Part ${part}`;
}

export function AdminQuestionBankClient({
  initialSkill = "listening",
  initialTab = "practice",
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(normalizeTab(initialTab));
  const [skill, setSkill] = useState<Skill>(normalizeSkill(initialSkill));
  const [mocks, setMocks] = useState<AdminMockListItem[]>([]);
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
  const [expandedMockIds, setExpandedMockIds] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedSetIds, setExpandedSetIds] = useState<Record<string, boolean>>(
    {},
  );
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuestionBankSetItem | null>(
    null,
  );

  const syncUrl = useCallback(
    (nextTab: Tab, nextSkill: Skill) => {
      const params = new URLSearchParams();
      params.set("tab", nextTab);
      params.set("skill", nextSkill);
      router.replace(`/admin/question-bank?${params.toString()}`, {
        scroll: false,
      });
    },
    [router],
  );

  const selectTab = (next: Tab) => {
    setTab(next);
    setShowCreate(false);
    setExpandedMockIds({});
    setExpandedSetIds({});
    syncUrl(next, skill);
  };

  const selectSkill = (next: Skill) => {
    setSkill(next);
    setShowCreate(false);
    setExpandedMockIds({});
    setExpandedSetIds({});
    syncUrl(tab, next);
  };

  const loadMocks = useCallback(async () => {
    const list = await adminApi.listMocks();
    setMocks(list);
  }, []);

  const loadPractice = useCallback(async (nextSkill: Skill) => {
    const res = await adminApi.listQuestionBank(nextSkill);
    setSets(res.sets);
  }, []);

  const loadPracticeTotals = useCallback(async () => {
    const results = await Promise.all(
      SKILLS.map(async (s) => {
        const res = await adminApi.listQuestionBank(s.value);
        const total = res.sets.reduce((sum, set) => sum + set.total_questions, 0);
        return [s.value, total] as const;
      }),
    );
    setPracticeTotals(
      Object.fromEntries(results) as Record<Skill, number>,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (tab === "mocks") {
          await loadMocks();
        } else {
          await loadPractice(skill);
        }
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
  }, [tab, skill, loadMocks, loadPractice]);

  useEffect(() => {
    if (tab !== "practice") return;
    let cancelled = false;
    (async () => {
      try {
        await loadPracticeTotals();
      } catch {
        if (!cancelled) {
          /* totals are secondary; detail load surfaces primary errors */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, loadPracticeTotals]);

  const liveMocks = useMemo(() => liveMocksOnly(mocks), [mocks]);

  const setsNewestFirst = useMemo(
    () =>
      [...sets].sort((a, b) => {
        const aTime = a.created_at ? Date.parse(a.created_at) : 0;
        const bTime = b.created_at ? Date.parse(b.created_at) : 0;
        if (bTime !== aTime) return bTime - aTime;
        if (b.bank_number !== a.bank_number) return b.bank_number - a.bank_number;
        return b.set_number - a.set_number;
      }),
    [sets],
  );

  const moduleTotals = useMemo(() => {
    if (tab === "mocks") {
      return SKILLS.map((s) => ({
        skill: s.value,
        label: s.label,
        count: sumMockModuleQuestions(liveMocks, s.value),
      }));
    }
    return SKILLS.map((s) => ({
      skill: s.value,
      label: s.label,
      count: practiceTotals[s.value] ?? 0,
    }));
  }, [tab, liveMocks, practiceTotals]);

  const skillLabel = SKILLS.find((s) => s.value === skill)?.label ?? skill;

  const mocksForSkill = useMemo(
    () =>
      liveMocks
        .filter((m) =>
          m.modules.some((mod) => mod.module === skill && mod.is_enabled),
        )
        .sort((a, b) => (a.catalog_number ?? 0) - (b.catalog_number ?? 0)),
    [liveMocks, skill],
  );

  const openCreate = () => {
    setTab("practice");
    setShowCreate(true);
    syncUrl("practice", skill);
  };

  const toggleMock = (id: string) => {
    setExpandedMockIds((prev) => ({ ...prev, [id]: !prev[id] }));
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
        [skill]: Math.max(0, (prev[skill] ?? 0) - item.total_questions),
      }));
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete practice set");
    } finally {
      setDeletingSetId(null);
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
        subtitle="Build reusable L / R / W / S practice sets section-by-section (same builders as mocks) and serve them to students via personalized plans."
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

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "practice" as const, label: "Practice sets" },
            { id: "mocks" as const, label: "Live mocks" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectTab(item.id)}
            className={cn(
              adminFilterPill,
              tab === item.id && adminFilterPillActive,
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showCreate ? (
        <AdminCreateQuestionBankSetForm
          initialSkill={skill}
          onCancel={() => setShowCreate(false)}
          onCreated={({ set_id, skill: createdSkill }) => {
            setShowCreate(false);
            setSkill(normalizeSkill(createdSkill));
            setTab("practice");
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
              <p className={cn(adminSubtext, "mt-1")}>questions</p>
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
              {skillLabel} · {tab === "mocks" ? "Live mocks" : "Practice sets"}
            </h2>
            <p className={cn(adminSubtext, "mt-1")}>
              {tab === "mocks"
                ? "Catalog mocks — expand a test to open each part in the mock builder."
                : "Reusable sets for personalized plans — newest first; click a set to expand parts."}
            </p>
          </div>
          {tab === "practice" && !showCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className={cn(adminBtnPrimary, "text-sm")}
            >
              Create {skillLabel} set
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className={adminSubtext}>Loading {skillLabel.toLowerCase()}…</p>
        ) : tab === "mocks" ? (
          mocksForSkill.length === 0 ? (
            <div className="py-10 text-center">
              <Library className="mx-auto size-8 text-ink/25" strokeWidth={1.5} />
              <p className={cn(adminHeading, "mt-3 text-base")}>
                No live mocks with {skillLabel}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {mocksForSkill.map((mock) => {
                const mod = mock.modules.find((m) => m.module === skill);
                const partCounts =
                  mod?.part_counts && mod.part_counts.length > 0
                    ? mod.part_counts
                    : (mod?.parts ?? []).map((p) => ({
                        part: p,
                        question_count: 0,
                      }));
                const open = expandedMockIds[mock.id] ?? false;
                return (
                  <li
                    key={mock.id}
                    className="rounded-[14px] border border-[#EAEEF3] bg-[#FBFCFE]"
                  >
                    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleMock(mock.id)}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-navy hover:bg-white"
                        aria-expanded={open}
                        aria-label={open ? "Collapse mock" : "Expand mock"}
                      >
                        {open ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/mocks/${mock.id}`}
                          className="truncate text-[14px] font-semibold text-navy hover:text-teal"
                        >
                          {mock.title}
                        </Link>
                        <p className={cn(adminSubtext, "mt-0.5 text-[12px]")}>
                          Catalog #{mock.catalog_number} ·{" "}
                          {mod?.question_count ?? 0} questions
                        </p>
                      </div>
                      <Link
                        href={`/admin/mocks/${mock.id}/${skill}/1`}
                        className={cn(adminLink, "inline-flex items-center gap-1 text-sm")}
                      >
                        Open builder
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                    {open ? (
                      <div className="flex flex-wrap gap-2 border-t border-[#EDF1F6] px-4 py-3">
                        {partCounts.length === 0 ? (
                          <p className={adminSubtext}>No parts configured.</p>
                        ) : (
                          partCounts.map((pc) => (
                            <Link
                              key={pc.part}
                              href={`/admin/mocks/${mock.id}/${skill}/${pc.part}`}
                              className={cn(
                                "inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition",
                                pc.question_count > 0
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-border-soft bg-white text-ink/70 hover:bg-ink/[0.03]",
                              )}
                            >
                              {partLabel(skill, pc.part)}
                              <span className="ml-1.5 text-xs opacity-70">
                                {pc.question_count}
                              </span>
                            </Link>
                          ))
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )
        ) : sets.length === 0 ? (
          <div className="py-10 text-center">
            <Library className="mx-auto size-8 text-ink/25" strokeWidth={1.5} />
            <p className={cn(adminHeading, "mt-3 text-base")}>
              No {skillLabel} practice sets yet
            </p>
            <p className={cn(adminSubtext, "mx-auto mt-1 max-w-md")}>
              Create a set, then add questions part by part with the full{" "}
              {skillLabel} builder — same UX as mocks, for personalized plan
              delivery.
            </p>
            {!showCreate ? (
              <button
                type="button"
                onClick={openCreate}
                className={cn(adminBtnPrimary, "mt-5")}
              >
                Create {skillLabel} set
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-3">
            {setsNewestFirst.map((item) => {
              const open = expandedSetIds[item.set_id] ?? false;
              const isCustom = item.is_custom || item.bank_number === 5;
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
                              <span className="mr-1.5 inline-flex rounded bg-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy">
                                Custom
                              </span>
                              Set {item.set_number}
                              {item.status ? ` · ${item.status}` : ""}
                            </>
                          ) : (
                            <>
                              Bank {item.bank_number} · Set {item.set_number} ·{" "}
                              {item.difficulty}
                            </>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[14px] font-semibold text-navy">
                          {item.title}
                        </span>
                        <span
                          className={cn(adminSubtext, "mt-0.5 block text-[12px]")}
                        >
                          {item.total_questions} question
                          {item.total_questions === 1 ? "" : "s"}
                          {item.hub_slug ? ` · hub ${item.hub_slug}` : ""}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => requestDeleteCustomSet(item)}
                          disabled={deletingSetId === item.set_id}
                          className={cn(
                            adminBtnSecondary,
                            "inline-flex items-center gap-1.5 border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50",
                          )}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          {deletingSetId === item.set_id ? "Deleting…" : "Delete"}
                        </button>
                      ) : null}
                      <Link
                        href={`/admin/question-bank/${skill}/${item.set_id}/1`}
                        className={cn(
                          adminBtnPrimary,
                          "inline-flex items-center gap-1 text-sm",
                        )}
                      >
                        Edit part 1
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
