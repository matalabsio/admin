"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EvaluatorAiPrescore,
  EvaluatorCriteriaRubric,
  EvaluatorOverallBand,
  EvaluatorPartTabs,
  EvaluatorReviewActions,
  EvaluatorScoreComparison,
  EvaluatorSpeakingAiAdvisory,
  EvaluatorSpeakingResponses,
  EvaluatorStudentContext,
  EvaluatorStudentHeader,
  EvaluatorQueueBadge,
  EvaluatorReviewHistory,
} from "@/components/admin/evaluator";
import {
  evaluatorCard,
  evaluatorCardPad,
} from "@/components/admin/evaluator/evaluator-ui";
import { adminLink } from "@/components/admin/admin-ui";
import { adminApi, type SpeakingReviewDetail } from "@/lib/admin-api";
import { compareSpeakingScores } from "@/lib/review-comparison";
import {
  hasLargeSpeakingOverride,
  orderedSpeakingResponses,
  speakingAiEvaluation,
  speakingPipelineState,
} from "@/lib/speaking-review-ui";
import {
  aiScoresToCriteria,
  computeOverallBand,
  CRITERIA_KEYS,
  CRITERIA_LABELS,
  type HumanCriteriaScores,
} from "@/lib/speaking-band";
import { cn } from "@/lib/utils";

type Props = { reviewId: string };

function isCompleteCriteria(
  scores: Partial<HumanCriteriaScores>,
): scores is HumanCriteriaScores {
  return CRITERIA_KEYS.every((key) => scores[key] != null);
}

export function AdminSpeakingDetailClient({ reviewId }: Props) {
  const [review, setReview] = useState<SpeakingReviewDetail | null>(null);
  const [criteria, setCriteria] = useState<Partial<HumanCriteriaScores>>({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activePart, setActivePart] = useState(1);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [humanConfirmed, setHumanConfirmed] = useState(false);
  const [approvalIdempotencyKey] = useState(
    () =>
      `${reviewId}:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`,
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adminApi.getSpeaking(reviewId);
      setReview(data);
      setFeedback(data.reviewer_notes ?? "");
      setCriteria(data.human_criteria_scores ?? {});
      const ordered = orderedSpeakingResponses(data);
      const initialPart = ordered[0]?.part ?? data.submission_meta?.part ?? 1;
      setActivePart(initialPart);
      setSelectedResponseId(
        ordered.find((response) => response.part === initialPart)?.response_id ??
          null,
      );
      setHumanConfirmed(data.status === "completed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load review");
    }
  }, [reviewId]);

  useEffect(() => {
    // Initial data hydration is intentionally driven by the route parameter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const overall = useMemo(() => computeOverallBand(criteria), [criteria]);
  const readOnly = review?.status === "completed";
  const responses = useMemo(
    () => (review ? orderedSpeakingResponses(review) : []),
    [review],
  );
  const responseCounts = useMemo(
    () =>
      responses.reduce<Partial<Record<number, number>>>((counts, response) => {
        counts[response.part] = (counts[response.part] ?? 0) + 1;
        return counts;
      }, {}),
    [responses],
  );
  const evaluation = useMemo(
    () => speakingAiEvaluation(review?.ai_scores ?? null),
    [review?.ai_scores],
  );
  const pipelineState = useMemo(
    () => (review ? speakingPipelineState(review) : "legacy"),
    [review],
  );
  const failedTranscriptCount = useMemo(
    () =>
      responses.filter(
        (response) => response.transcription_status?.toLowerCase() === "failed",
      ).length,
    [responses],
  );

  const comparison = useMemo(
    () =>
      compareSpeakingScores(
        criteria,
        review?.ai_scores ?? null,
        CRITERIA_LABELS,
      ),
    [criteria, review?.ai_scores],
  );
  const overriddenKeys = useMemo(
    () =>
      new Set(comparison.rows.filter((r) => r.overridden).map((r) => r.key)),
    [comparison],
  );
  const aiCriteria = useMemo(
    () => aiScoresToCriteria(review?.ai_scores ?? null),
    [review?.ai_scores],
  );
  const largeOverride = useMemo(
    () => hasLargeSpeakingOverride(comparison),
    [comparison],
  );

  const onCriteriaChange = (key: keyof HumanCriteriaScores, value: number) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
    setHumanConfirmed(false);
    setSuccess(null);
  };

  const acceptAiScores = () => {
    if (!aiCriteria) return;
    setCriteria(aiCriteria);
    setHumanConfirmed(false);
    setSuccess(
      "AI scores copied. Review each criterion and confirm your human assessment.",
    );
  };

  const saveDraft = async () => {
    if (!review) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Parameters<typeof adminApi.patchSpeaking>[1] = {
        reviewer_notes: feedback || undefined,
        status: "in_review",
      };
      if (isCompleteCriteria(criteria)) {
        body.human_criteria_scores = criteria;
      }
      const updated = await adminApi.patchSpeaking(reviewId, body);
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
    if (largeOverride && !feedback.trim()) {
      setError(
        "Add reviewer notes explaining any criterion or overall override of 1.0 band or more.",
      );
      return;
    }
    if (!humanConfirmed) {
      setError(
        "Confirm that you independently listened to the submitted recordings and assessed all four criteria before approval.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await adminApi.approveSpeaking(reviewId, {
        human_criteria_scores: criteria,
        reviewer_notes: feedback || undefined,
        audio_confirmed: true,
        confirmation: "confirm_final_approval",
        idempotency_key: approvalIdempotencyKey,
        ai_override_note: largeOverride ? feedback.trim() : undefined,
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
        <div className="h-40 animate-pulse rounded-2xl bg-navy/20" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/80" />
      </div>
    );
  }

  if (error && !review) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!review) return null;

  const studentName =
    review.student_name ?? review.student_email ?? "Speaking review";

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

  return (
    <div className="overflow-hidden">
      <div className="border-b border-[#EAEEF3] bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/speaking" className={adminLink}>
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
            <EvaluatorPartTabs
              activePart={activePart}
              responseCounts={responseCounts}
              onPartChange={(part) => {
                setActivePart(part);
                setSelectedResponseId(
                  responses.find((response) => response.part === part)
                    ?.response_id ?? null,
                );
              }}
            />

            <EvaluatorSpeakingResponses
              review={review}
              activePart={activePart}
              responses={responses}
              selectedResponseId={selectedResponseId}
              onSelectResponse={setSelectedResponseId}
              pipelineState={pipelineState}
              evaluation={evaluation}
            />

            <EvaluatorCriteriaRubric
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

            {!readOnly ? (
              <section
                className={cn(
                  evaluatorCard,
                  evaluatorCardPad,
                  "space-y-3 border-l-4 border-l-cyan",
                )}
              >
                <h3 className="text-sm font-bold text-navy">
                  Examiner confirmation
                </h3>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#334155]">
                  <input
                    type="checkbox"
                    checked={humanConfirmed}
                    onChange={(event) => {
                      setHumanConfirmed(event.target.checked);
                      setError(null);
                    }}
                    className="mt-0.5 size-4 rounded border-slate-300 accent-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                  />
                  <span>
                    I independently listened to the submitted recordings and assessed
                    all four criteria. Transcripts and AI evidence were advisory only.
                    {failedTranscriptCount > 0 ||
                    pipelineState === "transcription_failed" ? (
                      <>
                        {" "}
                        I understand that{" "}
                        {failedTranscriptCount > 0
                          ? `${failedTranscriptCount} ${
                              failedTranscriptCount === 1
                                ? "transcript is"
                                : "transcripts are"
                            } unavailable`
                          : "some transcript material is unavailable"}{" "}
                        and confirm these scores from the available audio.
                      </>
                    ) : null}
                  </span>
                </label>
                {largeOverride ? (
                  <p
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs",
                      feedback.trim()
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-900",
                    )}
                  >
                    A score differs from AI by at least 1.0 band. Reviewer notes are
                    required before approval
                    {feedback.trim() ? " and have been provided." : "."}
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4">
            <EvaluatorAiPrescore aiScores={review.ai_scores} />
            <EvaluatorSpeakingAiAdvisory
              evaluation={evaluation}
              attemptMetrics={review.attempt_metrics}
            />
            <EvaluatorScoreComparison
              comparison={comparison}
              onAcceptAi={acceptAiScores}
              readOnly={readOnly}
              hasAi={Boolean(aiCriteria)}
            />
            <EvaluatorStudentContext
              currentBand={review.student_current_band}
              targetBand={review.student_target_band}
            />
            <EvaluatorReviewHistory reviewId={review.id} module="speaking" />

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
