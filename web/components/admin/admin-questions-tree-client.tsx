"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminCard,
  adminFilterPill,
  adminFilterPillActive,
  adminLink,
  adminMutedLabel,
  adminTable,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { adminApi } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type Props = { mockId: string };

type TreeModule = {
  module: string;
  parts: {
    part: number;
    question_count: number;
    questions: {
      id: string;
      question_number: number;
      question_type: string;
      prompt: string;
    }[];
  }[];
};

export function AdminQuestionsTreeClient({ mockId }: Props) {
  const [modules, setModules] = useState<TreeModule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.questionTree(mockId);
      setModules((res.modules ?? []) as TreeModule[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [mockId]);

  useEffect(() => {
    void load();
  }, [load]);

  const flattened = useMemo(
    () =>
      modules.flatMap((mod) =>
        mod.parts.flatMap((part) =>
          part.questions.map((q) => ({ module: mod.module, part: part.part, ...q })),
        ),
      ),
    [modules],
  );
  const shown = useMemo(
    () => flattened.filter((row) => activeModule === "all" || row.module === activeModule),
    [flattened, activeModule],
  );
  const moduleStats = useMemo(
    () =>
      modules.map((m) => ({
        module: m.module,
        count: m.parts.reduce((sum, p) => sum + p.question_count, 0),
      })),
    [modules],
  );
  const maxCount = Math.max(...moduleStats.map((m) => m.count), 1);

  if (error) return <p className="text-red-600">{error}</p>;
  if (loading) return <p className="text-gray-600">Loading…</p>;
  if (!modules.length) {
    return <p className="text-gray-600">No questions for this mock yet.</p>;
  }

  return (
    <div className="space-y-6">
      <section className={cn(adminCard, "space-y-4")}>
        <p className={adminMutedLabel}>Module coverage</p>
        <ul className="space-y-3">
          {moduleStats.map((mod) => (
            <li key={mod.module}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold capitalize text-navy">{mod.module}</span>
                <span className="font-mono text-xs text-[#94A3B8]">{mod.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-[#EDF1F6]">
                <div
                  className="h-full rounded bg-cyan"
                  style={{ width: `${Math.max((mod.count / maxCount) * 100, 4)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveModule("all")}
          className={cn(adminFilterPill, activeModule === "all" && adminFilterPillActive)}
        >
          All modules
        </button>
        {modules.map((mod) => (
          <button
            key={mod.module}
            type="button"
            onClick={() => setActiveModule(mod.module)}
            className={cn(
              adminFilterPill,
              activeModule === mod.module && adminFilterPillActive,
            )}
          >
            {mod.module}
          </button>
        ))}
      </div>
      <div className={adminTable}>
        <table className="w-full min-w-[760px] text-left text-sm text-navy">
          <thead className={adminTableHead}>
            <tr>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Part</th>
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Prompt</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((q) => (
              <tr key={q.id} className="border-t border-[#EDF1F6]">
                <td className="px-4 py-3 capitalize">{q.module}</td>
                <td className="px-4 py-3 tabular-nums">{q.part}</td>
                <td className="px-4 py-3 tabular-nums">
                  <Link href={`/admin/mocks/${mockId}/questions/${q.id}`} className={adminLink}>
                    Q{q.question_number}
                  </Link>
                </td>
                <td className="px-4 py-3">{q.question_type}</td>
                <td className="max-w-[360px] truncate px-4 py-3 text-[#5A6B82]">
                  {q.prompt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
