"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Library,
  Layers,
  PencilLine,
  RefreshCw,
} from "lucide-react";
import {
  builderBankHref,
  type BuilderSkill,
} from "@/components/admin/admin-builder-source";
import {
  AdminChartCard,
  HorizontalBarChart,
  type ChartSegment,
} from "@/components/admin/admin-charts";
import { ModuleDonutChart } from "@/components/admin/admin-charts-recharts";
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
  adminSrNo,
  adminSrTd,
  adminSrTh,
} from "@/components/admin/admin-ui";
import {
  adminApi,
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
  listening: 1,
  reading: 1,
  writing: 1,
  speaking: 1,
};

function skillLabel(skill: string): string {
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

type SkillRow = {
  skill: Skill;
  practiceQuestions: number;
  setCount: number;
  filledSets: number;
  emptySets: number;
  customSets: number;
  partsFilled: number;
  partsTotal: number;
};

export function AdminQuestionBankOverviewClient() {
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
      const practiceLists = await Promise.all(
        SKILLS.map((skill) => adminApi.listQuestionBank(skill)),
      );
      const next: Record<Skill, QuestionBankSetItem[]> = {
        listening: [],
        reading: [],
        writing: [],
        speaking: [],
      };
      SKILLS.forEach((skill, i) => {
        next[skill] = (practiceLists[i]?.sets ?? []).filter(
          (s) => s.status !== "archived",
        );
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
        practiceQuestions,
        setCount: sets.length,
        filledSets,
        emptySets: sets.length - filledSets,
        customSets,
        partsFilled,
        partsTotal,
      };
    });
  }, [setsBySkill]);

  const practiceTotal = skillRows.reduce((s, r) => s + r.practiceQuestions, 0);
  const setTotal = skillRows.reduce((s, r) => s + r.setCount, 0);
  const filledSetTotal = skillRows.reduce((s, r) => s + r.filledSets, 0);
  const customSetTotal = skillRows.reduce((s, r) => s + r.customSets, 0);
  const coveragePct =
    setTotal > 0 ? Math.round((filledSetTotal / setTotal) * 100) : 0;

  const practiceSegments: ChartSegment[] = skillRows.map((r) => ({
    label: r.skill,
    value: r.practiceQuestions,
    color: SKILL_COLORS[r.skill],
  }));

  const fillBars = skillRows.map((r) => {
    const pct = r.partsTotal > 0 ? Math.round((r.partsFilled / r.partsTotal) * 100) : 0;
    return {
      label: r.skill,
      value: pct,
      color: SKILL_COLORS[r.skill],
      href: `/admin/question-bank?skill=${r.skill}`,
    };
  });

  const moduleBars = skillRows.map((r) => ({
    label: r.skill,
    value: r.practiceQuestions,
    color: SKILL_COLORS[r.skill],
    href: `/admin/question-bank?skill=${r.skill}`,
  }));

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

  const recentSets = useMemo(() => {
    const rows: { skill: Skill; set: QuestionBankSetItem }[] = [];
    for (const skill of SKILLS) {
      for (const set of setsBySkill[skill]) {
        rows.push({ skill, set });
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
        eyebrow="Personalized practice"
        title="Question bank overview"
        subtitle="Admin-uploaded practice sets for personalized plans — mocks live under Mock library."
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
            <Link href="/admin/mocks" className={adminBtnSecondary}>
              Mock library
            </Link>
            <Link href="/admin/question-bank?skill=listening" className={adminBtnPrimary}>
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
        aria-label="Practice bank key metrics"
      >
        <AdminKpiCard
          label="Practice questions"
          value={practiceTotal.toLocaleString()}
          hint="Admin-uploaded bank"
          Icon={Library}
          accent="teal"
          href="/admin/question-bank?skill=listening"
        />
        <AdminKpiCard
          label="Active sets"
          value={setTotal.toLocaleString()}
          hint={`${customSetTotal} custom bank`}
          Icon={Layers}
          accent="violet"
          href="/admin/question-bank?skill=listening"
        />
        <AdminKpiCard
          label="Sets with content"
          value={filledSetTotal.toLocaleString()}
          hint={`${setTotal - filledSetTotal} still empty`}
          Icon={PencilLine}
          accent="emerald"
        />
        <AdminKpiCard
          label="Set coverage"
          value={`${coveragePct}%`}
          hint={`${filledSetTotal}/${setTotal || 0} sets filled`}
          Icon={Layers}
          accent="amber"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminChartCard
          title="Questions by skill"
          subtitle="Admin practice bank only"
          headerExtra={
            <Link href="/admin/question-bank?skill=listening" className={adminLink}>
              Open sets
            </Link>
          }
        >
          {practiceTotal > 0 ? (
            <ModuleDonutChart segments={practiceSegments} centerLabel="practice" />
          ) : (
            <div className="py-8 text-center">
              <p className={adminSubtext}>No published practice questions yet.</p>
              <Link
                href="/admin/question-bank?skill=listening"
                className={cn(adminBtnPrimary, "mt-4 inline-flex")}
              >
                Create a set
              </Link>
            </div>
          )}
        </AdminChartCard>

        <AdminChartCard
          title="Questions per module"
          subtitle="Counts from admin-uploaded sets"
        >
          <HorizontalBarChart
            items={moduleBars}
            detailsHref="/admin/question-bank?skill=listening"
            totalLabel="practice questions"
          />
        </AdminChartCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <AdminChartCard
          title="Practice fill rate"
          subtitle="% of parts with at least one question"
        >
          <HorizontalBarChart
            items={fillBars}
            detailsHref="/admin/question-bank?skill=listening"
            detailsLabel="Edit practice sets"
            showTotal={false}
            valueSuffix="%"
          />
        </AdminChartCard>

        <div className={cn(adminCard, "min-w-0")}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[17px] font-bold text-navy">
                Recent practice sets
              </h3>
              <p className="mt-0.5 text-[12.5px] text-[#94A3B8]">
                Newest admin uploads — open a skill list to preview as a student
              </p>
            </div>
            <Link href="/admin/question-bank?skill=listening" className={adminLink}>
              All sets
            </Link>
          </div>
          {recentSets.length === 0 ? (
            <p className={cn(adminSubtext, "py-8 text-center")}>
              No practice sets yet. Create one from Manage sets.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className={adminTable}>
                <thead className={adminTableHead}>
                  <tr>
                    <th className={adminSrTh}>#</th>
                    <th className="px-3 py-2 text-left">Set</th>
                    <th className="px-3 py-2 text-left">Skill</th>
                    <th className="px-3 py-2 text-right">Qs</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSets.map(({ skill, set }, i) => (
                    <tr key={set.set_id} className="border-t border-[#EDF1F6]">
                      <td className={adminSrTd}>{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/admin/question-bank?skill=${skill}`}
                          className="font-semibold text-navy hover:text-teal"
                        >
                          {set.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#5A6B82]">
                        {skillLabel(skill)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[13px] tabular-nums">
                        {set.total_questions}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(adminMutedLabel, "uppercase")}>
                          {set.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={builderBankHref(skill as BuilderSkill, set.set_id, 1)}
                          className={adminLink}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {emptySets.length > 0 ? (
        <div className={cn(adminCard, "min-w-0")}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[17px] font-bold text-navy">
                Empty sets needing content
              </h3>
              <p className="mt-0.5 text-[12.5px] text-[#94A3B8]">
                Newest first — open the skill list to preview, or edit in the builder
              </p>
            </div>
          </div>
          <ul className="divide-y divide-[#F1F4F8]">
            {emptySets.map(({ skill, set }) => (
              <li key={set.set_id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/question-bank?skill=${skill}`}
                    className="block truncate text-[13.5px] font-semibold text-navy hover:text-teal"
                  >
                    {set.title}
                  </Link>
                  <span className="text-[11.5px] text-[#94A3B8]">
                    {skillLabel(skill)} · Bank {set.bank_number}.{set.set_number}
                  </span>
                </div>
                <Link
                  href={builderBankHref(skill as BuilderSkill, set.set_id, 1)}
                  className={adminLink}
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
