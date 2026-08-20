import type { QuestionBankDraftQueueItem } from "@/lib/admin-api";
import {
  type BuilderSkill,
  builderBankHref,
} from "@/components/admin/admin-builder-source";

export type DraftReviewNav = {
  positionLabel: string | null;
  prevHref: string | null;
  nextHref: string | null;
  index: number;
  total: number;
};

export function computeDraftReviewNav(
  items: QuestionBankDraftQueueItem[],
  setId: string,
): DraftReviewNav {
  const index = items.findIndex((item) => item.set_id === setId);
  if (index < 0 || items.length === 0) {
    return {
      positionLabel: null,
      prevHref: null,
      nextHref: null,
      index: -1,
      total: items.length,
    };
  }

  const current = items[index];
  const prev = index > 0 ? items[index - 1] : null;
  const next = index < items.length - 1 ? items[index + 1] : null;

  return {
    positionLabel: `Draft ${index + 1}/${items.length} · ${current.title}`,
    prevHref: prev
      ? builderBankHref(prev.skill as BuilderSkill, prev.set_id, 1, {
          preview: true,
        })
      : null,
    nextHref: next
      ? builderBankHref(next.skill as BuilderSkill, next.set_id, 1, {
          preview: true,
        })
      : null,
    index,
    total: items.length,
  };
}
