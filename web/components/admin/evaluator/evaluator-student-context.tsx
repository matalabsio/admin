"use client";

import {
  evaluatorCard,
  evaluatorCardPad,
  evaluatorTitle,
} from "@/components/admin/evaluator/evaluator-ui";
import { cn } from "@/lib/utils";

type Props = {
  currentBand: number | null;
  targetBand: number | null;
};

function bandLabel(band: number | null) {
  return band != null ? band.toFixed(1) : "—";
}

export function EvaluatorStudentContext({ currentBand, targetBand }: Props) {
  return (
    <section className={cn(evaluatorCard, evaluatorCardPad)}>
      <h3 className={evaluatorTitle}>Student context</h3>
      <dl className="mt-4">
        <div className="flex items-center justify-between border-b border-[#F1F4F8] py-2.5">
          <dt className="text-[13px] font-light text-[#5A6B82]">Current band</dt>
          <dd className="font-mono text-sm font-medium text-navy">
            {bandLabel(currentBand)}
          </dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-[13px] font-light text-[#5A6B82]">Target band</dt>
          <dd className="font-mono text-sm font-medium text-cyan">
            {bandLabel(targetBand)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
