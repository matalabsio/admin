import type {
  SpeakingAiEvaluation,
  SpeakingEvidenceQuote,
  SpeakingReviewDetail,
  SpeakingSubmissionResponse,
} from "@/lib/admin-api";
import type { ScoreComparison } from "@/lib/review-comparison";

export type SpeakingPipelineState =
  | "legacy"
  | "transcribing"
  | "transcription_failed"
  | "ai_pending"
  | "ai_failed"
  | "ai_stub"
  | "complete";

export function orderedSpeakingResponses(
  review: SpeakingReviewDetail,
): SpeakingSubmissionResponse[] {
  const responses = review.submission_meta?.responses ?? [];
  if (responses.length > 0) {
    return [...responses].sort(
      (a, b) =>
        a.sequence_number - b.sequence_number ||
        a.response_id.localeCompare(b.response_id),
    );
  }

  if (!review.audio_play_url && !review.transcript) return [];
  const part = review.submission_meta?.part ?? 1;
  return [
    {
      response_id: `legacy-${review.id}`,
      question_id: "legacy",
      part,
      sequence_number: 1,
      duration_sec: 0,
      audio_url: review.audio_url ?? "",
      audio_play_url: review.audio_play_url,
      transcription_status: review.transcript ? "completed" : null,
      transcript: review.transcript,
      prompt_title: review.submission_meta?.prompt_title,
      prompt: review.submission_meta?.cue_card,
      fluency_metrics: review.attempt_metrics,
    },
  ];
}

export function speakingAiEvaluation(
  aiScores: Record<string, unknown> | null,
): SpeakingAiEvaluation | null {
  const evaluation = aiScores?.evaluation;
  return evaluation && typeof evaluation === "object"
    ? (evaluation as SpeakingAiEvaluation)
    : null;
}

export function speakingEvidenceForResponse(
  evaluation: SpeakingAiEvaluation | null,
  responseId: string | null,
): SpeakingEvidenceQuote[] {
  if (!responseId) return [];
  return (evaluation?.evidence_quotes ?? []).filter(
    (item) => item.response_id === responseId,
  );
}

export function speakingPipelineState(
  review: SpeakingReviewDetail,
): SpeakingPipelineState {
  if (!(review.submission_meta?.responses?.length)) return "legacy";

  const progress = review.transcription_progress;
  if (progress?.failed) return "transcription_failed";
  if (progress && progress.completed < progress.total) return "transcribing";

  const aiStatus = String(review.ai_scores?.status ?? "pending");
  if (aiStatus === "ai_failed") return "ai_failed";
  if (aiStatus === "ai_stub") return "ai_stub";
  if (aiStatus === "ai_complete") return "complete";
  return "ai_pending";
}

export function hasLargeSpeakingOverride(
  comparison: ScoreComparison,
  threshold = 1,
): boolean {
  return (
    comparison.rows.some(
      (row) => row.delta != null && Math.abs(row.delta) >= threshold,
    ) ||
    (comparison.deltaOverall != null &&
      Math.abs(comparison.deltaOverall) >= threshold)
  );
}
