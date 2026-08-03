"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Library,
  Layers,
  PencilLine,
  RefreshCw,
} from "lucide-react";
import {
  AdminChartCard,
  HorizontalBarChart,
  type ChartSegment,
  type GroupedBarRow,
} from "@/components/admin/admin-charts";
import {
  ModuleDonutChart,
  MockVsPracticeBarChart,
} from "@/components/admin/admin-charts-recharts";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminLink,
  adminMutedLabel,
  adminSubtext,
  adminTable,
  adminTableHead,
} from "@/components/admin/admin-ui";
import {
  adminApi,
  type AdminMockListItem,
  type QuestionBankSetItem,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const SKILLS = ["listening", "reading", "writing", "speaking"] as const;
type Skill = (typeof SKILLS)[number];

const SKILL_COLORS: Record<Skill, string> = {
  listening: "#00BCD4",
  reading: "#0097A7",
  writing: "#0D1F3C",
  speaking: "#5A6B82",
};

const MAX_PARTS: Record<Skill, number> = {
  listening: 4,
  reading: 4,
  writing: 2,
  speaking: 3,
};

function liveMocksOnly(mocks: AdminMockListItem[]): AdminMockListItem[] {
  return mocks.filter((m) => m.is_published && m.catalog_number != null);
}

function sumMockModuleQuestions(mocks: AdminMockListItem[], module: string): number {
  return mocks.reduce((sum, mock) => {
    const mod = mock.modules.find((m) => m.module === module);
    return sum + (mod?.question_count ?? 0);
  }, 0);
}

function skillLabel(skill: string): string {
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

type SkillRow = {
  skill: Skill;
  mockQuestions: number;
  practiceQuestions: number;
  setCount: number;
  filledSets: number;
  emptySets: number;
  customSets: number;
  partsFilled: number;
  partsTotal: number;
};

export function AdminQuestionBankOverviewClient() {
  const [mocks, setMocks] = useState<AdminMockListItem[]>([]);
  const [setsBySkill, setSetsBySkill] = useState<Record<Skill, QuestionBankSetItem[]>>({
    listening: [],
    reading: [],
    writing: [],
    speaking: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mockList, ...practiceLists] = await Promise.all([
        adminApi.listMocks(),
        ...SKILLS.map((skill) => adminApi.listQuestionBank(skill)),
      ]);
      setMocks(mockList);
      const next: Record<Skill, QuestionBankSetItem[]> = {
        listening: [],
        reading: [],
        writing: [],
        speaking: [],
      };
      SKILLS.forEach((skill, i) => {
        next[skill] = practiceLists[i]?.sets ?? [];
      });
      setSetsBySkill(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load question bank overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const liveMocks = useMemo(() => liveMocksOnly(mocks), [mocks]);

  const skillRows: SkillRow[] = useMemo(() => {
    return SKILLS.map((skill) => {
      const sets = setsBySkill[skill];
      const practiceQuestions = sets.reduce((s, set) => s + set.total_questions, 0);
      const filledSets = sets.filter((s) => s.total_questions > 0).length;
      const customSets = sets.filter((s) => s.is_custom || s.bank_number === 5).length;
      const partsFilled = sets.reduce(
        (sum, set) => sum + set.sections.filter((sec) => sec.has_content).length,
        0,
      );
      const partsTotal = sets.reduce(
        (sum, set) => sum + Math.max(set.sections.length, MAX_PARTS[skill]),
        0,
      );
      return {
        skill,
        mockQuestions: sumMockModuleQuestions(liveMocks, skill),
        practiceQuestions,
        setCount: sets.length,
        filledSets,
        emptySets: sets.length - filledSets,
        customSets,
        partsFilled,
        partsTotal,
      };
    });
  }, [liveMocks, setsBySkill]);

  const mockTotal = skillRows.reduce((s, r) => s + r.mockQuestions, 0);
  const practiceTotal = skillRows.reduce((s, r) => s + r.practiceQuestions, 0);
  const setTotal = skillRows.reduce((s, r) => s + r.setCount, 0);
  const filledSetTotal = skillRows.reduce((s, r) => s + r.filledSets, 0);
  const coveragePct =
    setTotal > 0 ? Math.round((filledSetTotal / setTotal) * 100) : 0;

  const mockSegments: ChartSegment[] = skillRows.map((r) => ({
    label: r.skill,
    value: r.mockQuestions,
    color: SKILL_COLORS[r.skill],
  }));

  const practiceSegments: ChartSegment[] = skillRows.map((r) => ({
    label: r.skill,
    value: r.practiceQuestions,
    color: SKILL_COLORS[r.skill],
  }));

  const combinedSegments: ChartSegment[] = skillRows.map((r) => ({
    label: r.skill,
    value: r.mockQuestions + r.practiceQuestions,
    color: SKILL_COLORS[r.skill],
  }));

  const groupedRows: GroupedBarRow[] = skillRows.map((r) => ({
    skill: r.skill,
    mocks: r.mockQuestions,
    practice: r.practiceQuestions,
  }));

  const fillBars = skillRows.map((r) => {
    const pct = r.partsTotal > 0 ? Math.round((r.partsFilled / r.partsTotal) * 100) : 0;
    return {
      label: r.skill,
      value: pct,
      color: SKILL_COLORS[r.skill],
      href: `/admin/question-bank?tab=practice&skill=${r.skill}`,
    };
  });

  const emptySets = useMemo(() => {
    const rows: { skill: Skill; set: QuestionBankSetItem }[] = [];
    for (const skill of SKILLS) {
      for (const set of setsBySkill[skill]) {
        if (set.total_questions === 0) rows.push({ skill, set });
      }
    }
    return rows
      .sort((a, b) => {
        const aT = a.set.created_at ? Date.parse(a.set.created_at) : 0;
        const bT = b.set.created_at ? Date.parse(b.set.created_at) : 0;
        return bT - aT;
      })
      .slice(0, 8);
  }, [setsBySkill]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 animate-pulse rounded-[18px] bg-navy/10" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[18px] bg-white" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-[18px] bg-white" />
          <div className="h-72 animate-pulse rounded-[18px] bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Content inventory"
        title="Question bank overview"
        subtitle="Live mock and practice-bank inventory across L / R / W / S — counts, coverage, and gaps."
        actions={
          <>
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() => void load()}
              aria-label="Refresh overview"
            >
              <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
              Refresh
            </button>
            <Link href="/admin/question-bank?tab=practice&skill=listening" className={adminBtnPrimary}>
              <PencilLine className="mr-1.5 size-4" aria-hidden />
              Manage sets
            </Link>
          </>
        }
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <section
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        aria-label="Question bank key metrics"
      >
        <AdminKpiCard
          label="Total questions"
          value={(mockTotal + practiceTotal).toLocaleString()}
          hint="Mocks + practice bank"
          Icon={Library}
          accent="teal"
        />
        <AdminKpiCard
          label="Live mock questions"
          value={mockTotal.toLocaleString()}
          hint={`${liveMocks.length} catalog tests`}
          Icon={BookOpen}
          accent="emerald"
          href="/admin/question-bank?tab=mocks&skill=listening"
        />
        <AdminKpiCard
          label="Practice questions"
          value={practiceTotal.toLocaleString()}
          hint="Personalized plan bank"
          Icon={Layers}
          accent="violet"
          href="/admin/question-bank?tab=practice&skill=listening"
        />
        <AdminKpiCard
          label="Set coverage"
          value={`${coveragePct}%`}
          hint={`${filledSetTotal}/${setTotal} sets with content`}
          Icon={PencilLine}
          accent="amber"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminChartCard
          title="Share by module"
          subtitle="Combined live mocks + practice bank"
        >
          <ModuleDonutChart segments={combinedSegments} centerLabel="questions" />
        </AdminChartCard>

        <AdminChartCard
          title="Mocks vs practice"
          subtitle="Question counts side-by-side per skill"
        >
          <MockVsPracticeBarChart rows={groupedRows} />
        </AdminChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminChartCard
          title="Live mocks by module"
          subtitle="Published catalog question counts"
          headerExtra={
            <Link href="/admin/question-bank?tab=mocks&skill=listening" className={adminLink}>
              Open mocks tab
            </Link>
          }
        >
          <ModuleDonutChart segments={mockSegments} centerLabel="mock Qs" />
        </AdminChartCard>

        <AdminChartCard
          title="Practice bank by module"
          subtitle="Questions available for personalized plans"
          headerExtra={
            <Link href="/admin/question-bank?tab=practice&skill=listening" className={adminLink}>
              Open practice tab
            </Link>
          }
        >
          {practiceTotal > 0 ? (
            <ModuleDonutChart segments={practiceSegments} centerLabel="practice" />
          ) : (
            <div className="py-8 text-center">
              <p className={adminSubtext}>Practice bank is mostly empty.</p>
              <Link
                href="/admin/question-bank?tab=practice&skill=listening"
                className={cn(adminBtnPrimary, "mt-4 inline-flex")}
              >
                Start filling sets
              </Link>
            </div>
          )}
        </AdminChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <AdminChartCard
          title="Practice fill rate"
          subtitle="% of parts with at least one question"
        >
          <HorizontalBarChart
            items={fillBars}
            detailsHref="/admin/question-bank?tab=practice&skill=listening"
            detailsLabel="Edit practice sets"
            showTotal={false}
            valueSuffix="%"
          />
        </AdminChartCard>

        <div className={cn(adminCard, "min-w-0")}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[17px] font-bold text-navy">
                Empty sets needing content
              </h3>
              <p className="mt-0.5 text-[12.5px] text-[#94A3B8]">
                Newest first — click to open the builder
              </p>
            </div>
            <Link href="/admin/question-bank?tab=practice&skill=listening" className={adminLink}>
              All sets
            </Link>
          </div>
          {emptySets.length === 0 ? (
            <p className={cn(adminSubtext, "py-8 text-center")}>
              Every practice set has at least one question.
            </p>
          ) : (
            <ul className="divide-y divide-[#F1F4F8]">
              {emptySets.map(({ skill, set }) => (
                <li key={set.set_id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/question-bank/${skill}/${set.set_id}/1`}
                      className="block truncate text-[13.5px] font-semibold text-navy hover:text-teal"
                    >
                      {set.title}
                    </Link>
                    <p className="mt-0.5 text-[11.5px] text-[#94A3B8]">
                      {skillLabel(skill)}
                      {set.is_custom || set.bank_number === 5
                        ? ` · Custom · ${set.status ?? "draft"}`
                        : ` · Bank ${set.bank_number} · ${set.difficulty}`}
                    </p>
                  </div>
                  <Link
                    href={`/admin/question-bank/${skill}/${set.set_id}/1`}
                    className={cn(adminBtnSecondary, "shrink-0 px-3 py-1.5 text-xs")}
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={adminTable} aria-label="Per-skill inventory table">
        <div className="border-b border-[#EDF1F6] px-4 py-4 sm:px-6">
          <h3 className="font-display text-[17px] font-bold text-navy">
            Per-skill breakdown
          </h3>
          <p className="mt-0.5 text-[12.5px] text-[#94A3B8]">
            Full inventory table for mocks and practice sets
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className={adminTableHead}>
              <tr>
                <th className="px-4 py-3 sm:px-6">Skill</th>
                <th className="px-3 py-3 text-right">Mock Qs</th>
                <th className="px-3 py-3 text-right">Practice Qs</th>
                <th className="px-3 py-3 text-right">Sets</th>
                <th className="px-3 py-3 text-right">Filled</th>
                <th className="px-3 py-3 text-right">Empty</th>
                <th className="px-3 py-3 text-right">Custom</th>
                <th className="px-3 py-3 text-right">Parts fill</th>
                <th className="px-4 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F4F8]">
              {skillRows.map((row) => {
                const partsPct =
                  row.partsTotal > 0
                    ? Math.round((row.partsFilled / row.partsTotal) * 100)
                    : 0;
                return (
                  <tr key={row.skill} className="hover:bg-[#FBFCFE]">
                    <td className="px-4 py-3.5 sm:px-6">
                      <span className="flex items-center gap-2 font-semibold capitalize text-navy">
                        <span
                          className="size-2 rounded-sm"
                          style={{ backgroundColor: SKILL_COLORS[row.skill] }}
                          aria-hidden
                        />
                        {row.skill}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-navy">
                      {row.mockQuestions.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-navy">
                      {row.practiceQuestions.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-[#5A6B82]">
                      {row.setCount}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-[#15935B]">
                      {row.filledSets}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-[#B7791F]">
                      {row.emptySets}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-[#5A6B82]">
                      {row.customSets}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <span className="font-mono tabular-nums text-navy">{partsPct}%</span>
                      <span className={cn(adminMutedLabel, "ml-1.5 normal-case tracking-normal")}>
                        {row.partsFilled}/{row.partsTotal}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right sm:px-6">
                      <Link
                        href={`/admin/question-bank?tab=practice&skill=${row.skill}`}
                        className={cn(adminLink, "text-[12.5px]")}
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#EDF1F6] bg-[#FBFCFE] font-semibold">
                <td className="px-4 py-3 sm:px-6 text-navy">All</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-navy">
                  {mockTotal.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-navy">
                  {practiceTotal.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-[#5A6B82]">
                  {setTotal}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-[#15935B]">
                  {filledSetTotal}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-[#B7791F]">
                  {setTotal - filledSetTotal}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-[#5A6B82]">
                  {skillRows.reduce((s, r) => s + r.customSets, 0)}
                </td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-navy">
                  {coveragePct}%
                </td>
                <td className="px-4 py-3 sm:px-6" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
