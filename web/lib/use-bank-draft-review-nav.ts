"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminApi } from "@/lib/admin-api";
import {
  computeDraftReviewNav,
  type DraftReviewNav,
} from "@/lib/bank-draft-review-nav";
import type { BuilderSkill } from "@/components/admin/admin-builder-source";

const EMPTY_NAV: DraftReviewNav = {
  positionLabel: null,
  prevHref: null,
  nextHref: null,
  index: -1,
  total: 0,
};

export function useBankDraftReviewNav(opts: {
  enabled: boolean;
  setId: string;
  skill: BuilderSkill;
}): DraftReviewNav & {
  loading: boolean;
  stickyReviewProps: {
    reviewNavLabel: string | null;
    prevReviewHref: string | null;
    nextReviewHref: string | null;
  };
} {
  const { enabled, setId } = opts;
  const [nav, setNav] = useState<DraftReviewNav>(EMPTY_NAV);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setNav(EMPTY_NAV);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void adminApi
      .listQuestionBankDraftQueue()
      .then((res) => {
        if (cancelled) return;
        setNav(computeDraftReviewNav(res.items, setId));
      })
      .catch(() => {
        if (cancelled) return;
        setNav(EMPTY_NAV);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, setId]);

  return {
    ...nav,
    loading,
    stickyReviewProps: {
      reviewNavLabel: nav.positionLabel,
      prevReviewHref: nav.prevHref,
      nextReviewHref: nav.nextHref,
    },
  };
}

export function useAutoStudentPreview(opts: {
  enabled: boolean;
  loading: boolean;
  onPreview: () => void;
}) {
  const searchParams = useSearchParams();
  const autoPreview = searchParams.get("preview") === "1";
  const doneRef = useRef(false);

  useEffect(() => {
    if (!opts.enabled || !autoPreview || opts.loading || doneRef.current) return;
    doneRef.current = true;
    opts.onPreview();
  }, [opts.enabled, autoPreview, opts.loading, opts.onPreview]);
}
