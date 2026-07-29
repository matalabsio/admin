"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileAudio,
  Sparkles,
} from "lucide-react";
import { EvaluatorAudioPlayer } from "./evaluator-audio-player";
import {
  evaluatorBody,
  evaluatorCard,
  evaluatorCardPad,
  evaluatorMeta,
  evaluatorTitle,
} from "./evaluator-ui";
import type {
  SpeakingAiEvaluation,
  SpeakingFluencyMetrics,
  SpeakingReviewDetail,
  SpeakingSubmissionResponse,
} from "@/lib/admin-api";
import {
  speakingEvidenceForResponse,
  type SpeakingPipelineState,
} from "@/lib/speaking-review-ui";
import { cn } from "@/lib/utils";

const PIPELINE_COPY: Record<
  SpeakingPipelineState,
  { title: string; detail: string; tone: string }
> = {
  legacy: {
    title: "Legacy single recording",
    detail:
      "This submission predates per-response processing. Review the available combined audio and transcript.",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  },
  transcribing: {
    title: "Transcription in progress",
    detail:
      "Some responses are still being transcribed. AI evidence and scores are not final.",
    tone: "border-sky-200 bg-sky-50 text-sky-800",
  },
  transcription_failed: {
    title: "Transcription failed",
    detail:
      "At least one response could not be transcribed. Use the audio and do not rely on incomplete AI output.",
    tone: "border-red-200 bg-red-50 text-red-800",
  },
  ai_pending: {
    title: "AI evaluation pending",
    detail:
      "All available transcripts are complete; criterion estimates and evidence are still being generated.",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  ai_failed: {
    title: "AI evaluation failed",
    detail:
      "No complete AI recommendation is available. Continue with an independent human review.",
    tone: "border-red-200 bg-red-50 text-red-800",
  },
  ai_stub: {
    title: "Stub AI evaluation complete",
    detail:
      "This is schema-valid test output, not a real AI assessment. Do not use it as scoring evidence.",
    tone: "border-violet-200 bg-violet-50 text-violet-800",
  },
  complete: {
    title: "Transcription and AI complete",
    detail:
      "AI output is ready as advisory evidence. Human review remains authoritative.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
};

type Props = {
  review: SpeakingReviewDetail;
  activePart: number;
  responses: SpeakingSubmissionResponse[];
  selectedResponseId: string | null;
  onSelectResponse: (responseId: string) => void;
  pipelineState: SpeakingPipelineState;
  evaluation: SpeakingAiEvaluation | null;
};

function metricValue(
  value: number | null | undefined,
  suffix = "",
  digits = 0,
) {
  return value == null || !Number.isFinite(Number(value))
    ? "—"
    : `${Number(value).toFixed(digits)}${suffix}`;
}

function responseStatus(status?: string | null) {
  const normalized = status?.toLowerCase();
  if (normalized === "completed" || normalized === "complete") {
    return { label: "Transcript complete", className: "text-emerald-700" };
  }
  if (normalized === "failed") {
    return { label: "Transcription failed", className: "text-red-700" };
  }
  if (normalized === "processing") {
    return { label: "Transcribing", className: "text-sky-700" };
  }
  if (normalized === "queued" || normalized === "pending") {
    return { label: "Queued for transcription", className: "text-amber-700" };
  }
  return { label: "Transcription status unavailable", className: "text-slate-600" };
}

function MetricsGrid({ metrics }: { metrics?: SpeakingFluencyMetrics | null }) {
  const items = [
    ["Speaking rate", metricValue(metrics?.words_per_minute, " WPM")],
    ["Speaking time", metricValue(metrics?.total_speaking_seconds, "s", 1)],
    ["Long pauses", metricValue(metrics?.long_pauses)],
    ["Words", metricValue(metrics?.word_count)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-[#EAEEF3] bg-[#F8FAFC] p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
            {label}
          </dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-navy">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EvaluatorSpeakingResponses({
  review,
  activePart,
  responses,
  selectedResponseId,
  onSelectResponse,
  pipelineState,
  evaluation,
}: Props) {
  const partResponses = responses.filter((response) => response.part === activePart);
  const selected =
    partResponses.find((response) => response.response_id === selectedResponseId) ??
    partResponses[0] ??
    null;
  const metric =
    review.response_metrics.find(
      (item) => item.response_id === selected?.response_id,
    ) ??
    selected?.fluency_metrics ??
    null;
  const evidence = speakingEvidenceForResponse(
    evaluation,
    selected?.response_id ?? null,
  );
  const partPerformance = evaluation?.part_performance?.find(
    (item) => item.part === activePart,
  );
  const pipeline = PIPELINE_COPY[pipelineState];
  const progress = review.transcription_progress;

  return (
    <div
      id={`speaking-part-${activePart}`}
      role="tabpanel"
      aria-labelledby={`speaking-part-tab-${activePart}`}
      className="space-y-4"
    >
      <section className={cn("rounded-xl border px-4 py-3", pipeline.tone)} role="status">
        <div className="flex items-start gap-2.5">
          {pipelineState === "complete" || pipelineState === "ai_stub" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : pipelineState.includes("failed") ? (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <div>
            <p className="text-sm font-semibold">{pipeline.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed">{pipeline.detail}</p>
            {progress ? (
              <p className="mt-1.5 font-mono text-[11px]">
                {progress.completed}/{progress.total} complete
                {progress.processing ? ` · ${progress.processing} processing` : ""}
                {progress.queued ? ` · ${progress.queued} queued` : ""}
                {progress.failed ? ` · ${progress.failed} failed` : ""}
              </p>
            ) : null}
            {pipelineState === "ai_failed" &&
            typeof review.ai_scores?.error === "string" ? (
              <p className="mt-1.5 text-xs font-medium">
                {review.ai_scores.error}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {review.part_metrics[String(activePart)] ? (
        <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-3")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className={evaluatorTitle}>Part {activePart} metrics</h3>
            <span className="text-xs text-[#64748B]">
              Aggregated from completed responses
            </span>
          </div>
          <MetricsGrid metrics={review.part_metrics[String(activePart)]} />
        </section>
      ) : null}

      {partResponses.length > 1 ? (
        <div>
          <p className={cn(evaluatorMeta, "mb-2")}>Responses in Part {activePart}</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {partResponses.map((response, index) => {
              const active = response.response_id === selected?.response_id;
              const status = responseStatus(response.transcription_status);
              return (
                <button
                  key={response.response_id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectResponse(response.response_id)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
                    active
                      ? "border-cyan bg-cyan-soft/30"
                      : "border-[#EAEEF3] bg-white hover:border-[#C5D0DE]",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-navy">
                      Response {index + 1}
                    </span>
                    <span className="font-mono text-[10px] text-[#64748B]">
                      {response.duration_sec ? `${response.duration_sec}s` : "Duration —"}
                    </span>
                  </span>
                  <span className={cn("mt-1 block text-[11px]", status.className)}>
                    {status.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!selected ? (
        <section className={cn(evaluatorCard, evaluatorCardPad)}>
          <p className={evaluatorTitle}>No response submitted for Part {activePart}</p>
          <p className={cn(evaluatorBody, "mt-1")}>
            There is no audio or transcript to review for this part.
          </p>
        </section>
      ) : (
        <>
          <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-3")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className={evaluatorMeta}>Prompt</p>
                <h3 className={cn(evaluatorTitle, "mt-1")}>
                  {selected.prompt_title ??
                    (selected.question_id !== "legacy"
                      ? `Question ${selected.sequence_number}`
                      : review.submission_meta?.prompt_title ?? "Legacy response")}
                </h3>
              </div>
              <span className="font-mono text-[10px] text-[#64748B]">
                ID {selected.question_id}
              </span>
            </div>
            {selected.prompt ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#334155]">
                {selected.prompt}
              </p>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-[#64748B]">
                Prompt text is not included in this submission contract.
              </p>
            )}
          </section>

          <EvaluatorAudioPlayer
            key={selected.response_id}
            audioUrl={selected.audio_play_url ?? null}
            partLabel={`Part ${activePart} · Response ${partResponses.indexOf(selected) + 1}`}
          />

          <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-3")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={evaluatorTitle}>Transcript</h3>
              <span className={cn("text-xs font-medium", responseStatus(selected.transcription_status).className)}>
                {responseStatus(selected.transcription_status).label}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-[1.75] text-[#334155]">
              {selected.transcript?.trim() ||
                (selected.transcription_status === "failed"
                  ? "Transcription failed. Review the recording directly."
                  : "Transcript is not available yet.")}
            </p>
          </section>

          <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-3")}>
            <h3 className={evaluatorTitle}>Response metrics</h3>
            <MetricsGrid metrics={metric} />
          </section>

          <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-3")}>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#1E63B8]" aria-hidden />
              <h3 className={evaluatorTitle}>
                AI evidence for response {partResponses.indexOf(selected) + 1}
              </h3>
            </div>
            {partPerformance ? (
              <p className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-[#334155]">
                <span className="font-semibold">
                  Estimated band {Number(partPerformance.band_estimate).toFixed(1)}:
                </span>{" "}
                {partPerformance.note}
              </p>
            ) : null}
            {evidence.length ? (
              <ul className="space-y-3" aria-label="Response-specific AI evidence">
                {evidence.map((item, index) => (
                  <li
                    key={`${item.response_id}-${item.criterion}-${item.quote}-${index}`}
                    className={cn(
                      "rounded-xl border border-l-4 px-4 py-3 text-sm",
                      item.polarity === "strength"
                        ? "border-emerald-200 border-l-emerald-500 bg-emerald-50 text-emerald-950"
                        : "border-amber-200 border-l-amber-500 bg-amber-50 text-amber-950",
                    )}
                  >
                    <article aria-labelledby={`evidence-${selected.response_id}-${index}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4
                          id={`evidence-${selected.response_id}-${index}`}
                          className="font-semibold"
                        >
                          {item.title?.trim() ||
                            (item.polarity === "strength"
                              ? "Supporting evidence"
                              : "Improvement evidence")}
                        </h4>
                        <span className="font-mono text-[10px] font-semibold uppercase">
                          {item.criterion} · {item.polarity}
                        </span>
                      </div>
                      <q className="mt-2 block border-l-2 border-current/25 pl-3 leading-relaxed">
                        {item.quote}
                      </q>
                      {item.issue?.trim() ? (
                        <p className="mt-2 font-semibold">{item.issue}</p>
                      ) : null}
                      {item.explanation?.trim() ? (
                        <p className="mt-1 leading-relaxed">{item.explanation}</p>
                      ) : null}
                      {item.suggestion?.trim() ? (
                        <p className="mt-2 rounded-lg bg-white/60 px-3 py-2 leading-relaxed">
                          <span className="font-semibold">Suggestion: </span>
                          {item.suggestion}
                        </p>
                      ) : null}
                      <p className="mt-2 font-mono text-[10px] opacity-70">
                        Question ID {item.question_id}
                      </p>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={evaluatorBody}>
                {pipelineState === "complete" || pipelineState === "ai_stub"
                  ? "No AI evidence was released for this response. Use the recording and your independent assessment."
                  : "Evidence will appear only after transcription and AI evaluation complete."}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function EvaluatorSpeakingAiAdvisory({
  evaluation,
  attemptMetrics,
}: {
  evaluation: SpeakingAiEvaluation | null;
  attemptMetrics?: SpeakingFluencyMetrics | null;
}) {
  const confidence = evaluation?.band_scores?.P_confidence;
  const lowConfidence = confidence != null && confidence < 0.7;
  return (
    <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-2")}>
      <div className="flex items-center gap-2">
        <FileAudio className="size-4 text-[#1E63B8]" aria-hidden />
        <h3 className="text-sm font-bold text-navy">AI limitations</h3>
      </div>
      <p className="text-xs leading-relaxed text-[#64748B]">
        AI scores are advisory, based on the available audio, transcript, and computed
        fluency metrics. They can miss context, accent variation, audio artifacts, and
        interaction quality. Confirm every criterion yourself before approval.
      </p>
      {attemptMetrics ? (
        <dl className="grid grid-cols-2 gap-2 border-t border-[#EAEEF3] pt-2 text-xs">
          <div>
            <dt className="text-[#64748B]">Attempt rate</dt>
            <dd className="font-mono font-semibold text-navy">
              {metricValue(attemptMetrics.words_per_minute, " WPM")}
            </dd>
          </div>
          <div>
            <dt className="text-[#64748B]">Total speaking</dt>
            <dd className="font-mono font-semibold text-navy">
              {metricValue(attemptMetrics.total_speaking_seconds, "s", 1)}
            </dd>
          </div>
        </dl>
      ) : null}
      {lowConfidence ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Pronunciation confidence is low ({Math.round(confidence * 100)}%). Listen to
          the recordings and assess pronunciation independently.
        </p>
      ) : null}
    </section>
  );
}
