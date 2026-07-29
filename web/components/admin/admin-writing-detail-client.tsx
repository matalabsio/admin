"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EvaluatorAiPrescore,
  EvaluatorOverallBand,
  EvaluatorReviewActions,
  EvaluatorScoreComparison,
  EvaluatorStudentContext,
  EvaluatorStudentHeader,
  EvaluatorQueueBadge,
  EvaluatorWritingRubric,
  EvaluatorReviewHistory,
} from "@/components/admin/evaluator";
import {
  evaluatorCard,
  evaluatorCardPad,
} from "@/components/admin/evaluator/evaluator-ui";
import { adminLink } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { adminApi, type WritingReviewDetail } from "@/lib/admin-api";
import { compareWritingScores } from "@/lib/review-comparison";
import {
  aiScoresToWritingCriteria,
  computeWritingOverallBand,
  WRITING_CRITERIA_KEYS,
  WRITING_CRITERIA_LABELS,
  defaultWritingCriteriaFromReview,
  type WritingHumanCriteriaScores,
} from "@/lib/writing-band";
import { cn } from "@/lib/utils";

type Props = { reviewId: string; source: "mock" | "diagnostic" };

function isCompleteCriteria(
  scores: Partial<WritingHumanCriteriaScores>,
): scores is WritingHumanCriteriaScores {
  return WRITING_CRITERIA_KEYS.every((key) => scores[key] != null);
}

function EssayPanel({
  question,
  essay,
  wordCount,
  taskLabel,
}: {
  question: string | null;
  essay: string | null;
  wordCount: number | null;
  taskLabel: string | null;
}) {
  return (
    <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-navy">
          {taskLabel ?? "Student essay"}
        </h3>
        {wordCount != null ? (
          <span className="rounded-full bg-cyan-soft px-2.5 py-1 font-mono text-xs font-semibold text-teal">
            {wordCount} words
          </span>
        ) : null}
      </div>
      {question ? (
        <div className="rounded-xl border border-[#EAEEF3] bg-[#F8FAFC] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
            Question
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
            {question}
          </p>
        </div>
      ) : null}
      <div className="rounded-xl border border-[#EAEEF3] bg-white px-4 py-4">
        <p className="whitespace-pre-wrap text-sm leading-[1.75] text-ink/85">
          {essay?.trim() ? essay : "No essay text available."}
        </p>
      </div>
    </section>
  );
}

function AiFeedbackPanel({ feedback }: { feedback: Record<string, unknown> | null }) {
  if (!feedback) return null;
  const sections = [
    { key: "strengths", label: "Strengths" },
    { key: "weaknesses", label: "Weaknesses" },
    { key: "improvement_tips", label: "Improvement tips" },
  ] as const;

  return (
    <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-3")}>
      <h3 className="text-sm font-bold text-navy">AI feedback</h3>
      {sections.map(({ key, label }) => {
        const items = feedback[key];
        if (!Array.isArray(items) || items.length === 0) return null;
        return (
          <div key={key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              {label}
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-ink/75">
              {items.map((item, i) => (
                <li key={i}>{String(item)}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

export function AdminWritingDetailClient({ reviewId, source }: Props) {
  const [review, setReview] = useState<WritingReviewDetail | null>(null);
  const [criteria, setCriteria] = useState<Partial<WritingHumanCriteriaScores>>({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adminApi.getWriting(reviewId, source);
      setReview(data);
      setFeedback(data.reviewer_notes ?? "");
      const defaults = defaultWritingCriteriaFromReview(
        data.human_criteria_scores,
        data.ai_scores,
      );
      setCriteria(defaults ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load review");
    }
  }, [reviewId, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const overall = useMemo(() => computeWritingOverallBand(criteria), [criteria]);
  const readOnly = review?.status === "completed";

  const comparison = useMemo(
    () =>
      compareWritingScores(
        criteria,
        review?.ai_scores ?? null,
        WRITING_CRITERIA_LABELS,
      ),
    [criteria, review?.ai_scores],
  );
  const overriddenKeys = useMemo(
    () =>
      new Set(comparison.rows.filter((r) => r.overridden).map((r) => r.key)),
    [comparison],
  );
  const aiCriteria = useMemo(
    () => aiScoresToWritingCriteria(review?.ai_scores ?? null),
    [review?.ai_scores],
  );

  const onCriteriaChange = (key: keyof WritingHumanCriteriaScores, value: number) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
    setSuccess(null);
  };

  const acceptAiScores = () => {
    if (!aiCriteria) return;
    setCriteria(aiCriteria);
    setSuccess("Copied AI scores into the rubric.");
  };

  const saveDraft = async () => {
    if (!review) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Parameters<typeof adminApi.patchWriting>[2] = {
        reviewer_notes: feedback || undefined,
        status: "in_review",
      };
      if (isCompleteCriteria(criteria)) {
        body.human_criteria_scores = criteria;
      }
      const updated = await adminApi.patchWriting(reviewId, source, body);
      setReview(updated);
      setSuccess("Draft saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save draft");
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!isCompleteCriteria(criteria)) {
      setError("Select a half-band for all four criteria before submitting.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await adminApi.approveWriting(reviewId, source, {
        human_criteria_scores: criteria,
        reviewer_notes: feedback || undefined,
      });
      setReview(updated);
      setCriteria(updated.human_criteria_scores ?? criteria);
      setSuccess("Review submitted successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  if (!review && !error) {
    return (
      <div className="space-y-4 p-4 sm:p-5" aria-busy>
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/80" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/80" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/80" />
      </div>
    );
  }

  if (error && !review) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!review) return null;

  const studentName =
    review.student_name ?? review.student_email ?? "Writing review";

  const actionProps = {
    feedback,
    onFeedbackChange: setFeedback,
    onSaveDraft: () => void saveDraft(),
    onSubmit: () => void submitReview(),
    busy,
    readOnly,
    successMessage: success,
    error,
  };

  const aiPrescoreScores = review.ai_scores;

  return (
    <div className="overflow-hidden">
      <div className="border-b border-[#EAEEF3] bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/writing" className={adminLink}>
            ← Back to queue
          </Link>
          <EvaluatorQueueBadge count={review.queue_pending_count} />
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6 lg:p-7">
        <EvaluatorStudentHeader
          name={studentName}
          email={review.student_email}
          submittedAt={review.created_at}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
          <div className="space-y-5">
            <EssayPanel
              question={review.question}
              essay={review.essay}
              wordCount={review.word_count}
              taskLabel={review.task_label}
            />

            <EvaluatorWritingRubric
              scores={criteria}
              onChange={onCriteriaChange}
              readOnly={readOnly}
              overriddenKeys={overriddenKeys}
            />

            <section
              className={cn(
                evaluatorCard,
                evaluatorCardPad,
                "flex flex-col gap-6 lg:flex-row lg:items-start",
              )}
            >
              <EvaluatorOverallBand
                overall={overall}
                reviewStatus={review.status}
              />
              <div className="hidden min-w-0 flex-1 lg:block">
                <EvaluatorReviewActions
                  {...actionProps}
                  variant="feedback-only"
                />
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4">
            {(review.ai_status || review.ai_error) && (
              <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-2")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-navy">AI status</h3>
                  <span className="rounded-full bg-cyan-soft px-2.5 py-1 font-mono text-xs font-semibold text-teal">
                    {review.ai_status ?? "unknown"}
                  </span>
                </div>
                {review.ai_error ? (
                  <p className="text-sm text-danger">{review.ai_error}</p>
                ) : null}
                {source === "mock" &&
                (review.ai_status === "ai_failed" ||
                  review.ai_status === "pending") &&
                !readOnly ? (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      void (async () => {
                        setBusy(true);
                        setError(null);
                        try {
                          const updated = await adminApi.retryWritingAi(
                            reviewId,
                            source,
                          );
                          setReview(updated);
                          setSuccess("AI evaluation re-queued.");
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "Retry failed",
                          );
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  >
                    Retry AI evaluation
                  </Button>
                ) : null}
              </section>
            )}
            <EvaluatorAiPrescore
              aiScores={aiPrescoreScores}
              variant="writing"
            />
            <EvaluatorScoreComparison
              comparison={comparison}
              onAcceptAi={acceptAiScores}
              readOnly={readOnly}
              hasAi={Boolean(aiCriteria)}
            />
            <AiFeedbackPanel feedback={review.ai_feedback} />
            <EvaluatorStudentContext
              currentBand={review.student_current_band}
              targetBand={review.student_target_band}
            />
            <EvaluatorReviewHistory
              reviewId={review.id}
              module="writing"
              source={source}
            />

            <div className="hidden lg:block">
              <EvaluatorReviewActions {...actionProps} variant="actions-only" />
            </div>

            {readOnly ? (
              <p className="px-1 text-sm font-light text-[#5A6B82]">
                Completed
                {review.reviewed_at
                  ? ` · ${new Date(review.reviewed_at).toLocaleString()}`
                  : ""}
              </p>
            ) : null}
          </aside>
        </div>

        {!readOnly ? (
          <div className={cn(evaluatorCard, evaluatorCardPad, "lg:hidden")}>
            <EvaluatorReviewActions {...actionProps} variant="full" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
