"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Mail, Send } from "lucide-react";
import {
  EvaluatorCriteriaRubric,
  EvaluatorOverallBand,
  EvaluatorQueueHeader,
  EvaluatorWritingRubric,
} from "@/components/admin/evaluator";
import {
  evaluatorCard,
  evaluatorCardPad,
} from "@/components/admin/evaluator/evaluator-ui";
import {
  adminLink,
  adminPageBg,
} from "@/components/admin/admin-ui";
import {
  adminApi,
  type DiagnosticDetail,
  type WritingReviewDetail,
} from "@/lib/admin-api";
import {
  computeOverallBand,
  CRITERIA_KEYS,
  type HumanCriteriaScores,
} from "@/lib/speaking-band";
import {
  computeWritingOverallBand,
  defaultWritingCriteriaFromReview,
  WRITING_CRITERIA_KEYS,
  type WritingHumanCriteriaScores,
} from "@/lib/writing-band";
import { cn } from "@/lib/utils";

type Props = { diagnosticId: string };

function isCompleteCriteria(
  scores: Partial<HumanCriteriaScores>,
): scores is HumanCriteriaScores {
  return CRITERIA_KEYS.every((key) => scores[key] != null);
}

function isCompleteWritingCriteria(
  scores: Partial<WritingHumanCriteriaScores>,
): scores is WritingHumanCriteriaScores {
  return WRITING_CRITERIA_KEYS.every((key) => scores[key] != null);
}

function bandLabel(band: number | null | undefined) {
  if (band == null) return "—";
  return band.toFixed(1);
}

function aggregateBand(
  l: number | null,
  r: number | null,
  w: number | null,
  s: number | null,
): number | null {
  const bands = [l, r, w, s].filter((b): b is number => b != null && b > 0);
  if (bands.length === 0) return null;
  return Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2;
}

export function AdminDiagnosticDetailClient({ diagnosticId }: Props) {
  const [detail, setDetail] = useState<DiagnosticDetail | null>(null);
  const [criteria, setCriteria] = useState<Partial<HumanCriteriaScores>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [writingReview, setWritingReview] = useState<WritingReviewDetail | null>(null);
  const [writingCriteria, setWritingCriteria] = useState<
    Partial<WritingHumanCriteriaScores>
  >({});
  const [writingNotes, setWritingNotes] = useState("");
  const [writingBusy, setWritingBusy] = useState(false);
  const [writingError, setWritingError] = useState<string | null>(null);
  const [writingSuccess, setWritingSuccess] = useState<string | null>(null);

  const loadWriting = useCallback(async () => {
    setWritingError(null);
    try {
      const data = await adminApi.getWriting(diagnosticId, "diagnostic");
      setWritingReview(data);
      setWritingNotes(data.reviewer_notes ?? "");
      const defaults = defaultWritingCriteriaFromReview(
        data.human_criteria_scores,
        data.ai_scores,
      );
      setWritingCriteria(defaults ?? {});
    } catch (e) {
      setWritingError(
        e instanceof Error ? e.message : "Failed to load writing review",
      );
    }
  }, [diagnosticId]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await adminApi.getDiagnostic(diagnosticId);
      setDetail(data);
      setNotes(data.speaking_reviewer_notes ?? "");
      if (data.speaking_human_criteria_scores) {
        setCriteria(data.speaking_human_criteria_scores);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load diagnostic");
    }
  }, [diagnosticId]);

  useEffect(() => {
    void load();
    void loadWriting();
  }, [load, loadWriting]);

  const speakingOverall = useMemo(() => computeOverallBand(criteria), [criteria]);
  const writingOverall = useMemo(
    () => computeWritingOverallBand(writingCriteria),
    [writingCriteria],
  );
  const writingReadOnly = writingReview?.status === "completed";

  const saveWritingDraft = async () => {
    setWritingBusy(true);
    setWritingError(null);
    setWritingSuccess(null);
    try {
      const body: Parameters<typeof adminApi.patchWriting>[2] = {
        reviewer_notes: writingNotes || undefined,
        status: "in_review",
      };
      if (isCompleteWritingCriteria(writingCriteria)) {
        body.human_criteria_scores = writingCriteria;
      }
      const updated = await adminApi.patchWriting(diagnosticId, "diagnostic", body);
      setWritingReview(updated);
      setWritingSuccess("Writing draft saved.");
    } catch (e) {
      setWritingError(e instanceof Error ? e.message : "Could not save draft");
    } finally {
      setWritingBusy(false);
    }
  };

  const approveWriting = async () => {
    if (!isCompleteWritingCriteria(writingCriteria)) {
      setWritingError("Select a half-band for all four Writing criteria.");
      return;
    }
    setWritingBusy(true);
    setWritingError(null);
    setWritingSuccess(null);
    try {
      const updated = await adminApi.approveWriting(diagnosticId, "diagnostic", {
        human_criteria_scores: writingCriteria,
        reviewer_notes: writingNotes || undefined,
      });
      setWritingReview(updated);
      setWritingCriteria(updated.human_criteria_scores ?? writingCriteria);
      setWritingSuccess("Writing band saved.");
      await load();
    } catch (e) {
      setWritingError(e instanceof Error ? e.message : "Could not save Writing band");
    } finally {
      setWritingBusy(false);
    }
  };

  const reportBands = useMemo(() => {
    if (!detail) return null;
    const writing = detail.writing_human_band ?? detail.writing_band;
    const speaking = detail.speaking_human_band;
    return {
      listening: detail.listening_band,
      reading: detail.reading_band,
      writing,
      speaking,
      overall: aggregateBand(
        detail.listening_band,
        detail.reading_band,
        writing,
        speaking,
      ),
    };
  }, [detail]);

  const canSendReport =
    !!detail?.email &&
    detail.speaking_human_band != null &&
    (detail.writing_human_band != null || detail.writing_band != null);

  const saveSpeaking = async () => {
    if (!isCompleteCriteria(criteria)) {
      setError("Select a half-band for all four Speaking criteria.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await adminApi.patchDiagnosticSpeaking(diagnosticId, {
        human_criteria_scores: criteria,
        reviewer_notes: notes || undefined,
      });
      setDetail(updated);
      setSuccess("Speaking band saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save Speaking band");
    } finally {
      setBusy(false);
    }
  };

  const sendReport = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminApi.sendDiagnosticReport(diagnosticId);
      setSuccess(`Report sent to ${res.recipient}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send report");
    } finally {
      setBusy(false);
    }
  };

  if (!detail && !error) {
    return (
      <div className={cn(adminPageBg, "px-4 py-10 text-center text-sm text-[#94A3B8]")}>
        Loading…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={cn(adminPageBg, "px-4 py-10 text-center")}>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const writingBand = detail.writing_human_band ?? detail.writing_band;

  return (
    <div className={cn(adminPageBg, "px-4 py-6 sm:px-6 sm:py-8")}>
      <div className="mx-auto max-w-4xl space-y-6">
        <EvaluatorQueueHeader
          pendingCount={detail.status === "pending_review" ? 1 : 0}
          activeModule="diagnostics"
          title={detail.full_name}
          subtitle={`Submitted ${new Date(detail.created_at).toLocaleString()}`}
        />

        <Link
          href="/admin/diagnostics"
          className={cn(adminLink, "inline-flex items-center gap-1.5 text-sm")}
        >
          <ArrowLeft className="size-4" />
          Back to diagnostics queue
        </Link>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-teal" role="status">
            {success}
          </p>
        ) : null}

        <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-3")}>
          <h2 className="font-display text-lg font-bold text-navy">Student</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Email
              </p>
              {detail.email ? (
                <a href={`mailto:${detail.email}`} className={adminLink}>
                  {detail.email}
                </a>
              ) : (
                <p className="text-[#5A6B82]">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Phone
              </p>
              <p className="text-[#5A6B82]">{detail.phone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Goal
              </p>
              <p className="text-[#5A6B82]">
                {detail.goal_label ?? "—"}
                {detail.target_band != null
                  ? ` · Target ${detail.target_band.toFixed(1)}`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Status
              </p>
              <p className="text-[#5A6B82]">{detail.status.replace(/_/g, " ")}</p>
            </div>
          </div>
        </section>

        <section className={cn(evaluatorCard, evaluatorCardPad)}>
          <h2 className="mb-4 font-display text-lg font-bold text-navy">Bands</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Listening", detail.listening_band],
              ["Reading", detail.reading_band],
              ["Writing", writingBand],
              ["Speaking", detail.speaking_human_band ?? detail.speaking_band],
              ["Overall", reportBands?.overall ?? detail.aggregate_band],
            ].map(([label, band]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-[#E8EDF3] bg-[#F8FAFC] px-3 py-3 text-center"
              >
                <p className="text-[10px] font-semibold tracking-wide text-[#94A3B8] uppercase">
                  {label}
                </p>
                <p className="mt-1 font-mono text-xl font-medium text-navy">
                  {bandLabel(band as number | null)}
                </p>
              </div>
            ))}
          </div>
          {detail.speaking_human_band == null && detail.speaking_band != null ? (
            <p className="mt-3 text-xs text-[#94A3B8]">
              Speaking placeholder (completion-based) until examiner scores below.
            </p>
          ) : null}
        </section>

        <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-5")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-navy">
              Writing review
            </h2>
            {writingReview?.human_band != null ? (
              <span className="rounded-full bg-cyan-soft px-3 py-1 font-mono text-xs font-bold text-teal">
                Human band {writingReview.human_band.toFixed(1)}
              </span>
            ) : null}
          </div>

          {writingError ? (
            <p className="text-sm text-red-600" role="alert">
              {writingError}
            </p>
          ) : null}
          {writingSuccess ? (
            <p className="text-sm text-teal" role="status">
              {writingSuccess}
            </p>
          ) : null}

          {writingReview?.essay?.trim() ? (
            <>
              <div className="space-y-3 text-sm text-[#5A6B82]">
                <p>
                  AI band:{" "}
                  <span className="font-mono font-medium text-navy">
                    {bandLabel(
                      typeof writingReview.ai_scores?.overall_band === "number"
                        ? (writingReview.ai_scores.overall_band as number)
                        : (detail.writing?.overall_band ?? null),
                    )}
                  </span>
                  {writingReview.word_count != null
                    ? ` · ${writingReview.word_count} words`
                    : ""}
                </p>
                {writingReview.question ? (
                  <div className="rounded-xl border border-[#E8EDF3] bg-[#F8FAFC] px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
                      Question
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                      {writingReview.question}
                    </p>
                  </div>
                ) : null}
                <div className="max-h-72 overflow-y-auto rounded-xl border border-[#E8EDF3] bg-white px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-[1.7] text-ink/85">
                    {writingReview.essay}
                  </p>
                </div>
              </div>

              <EvaluatorWritingRubric
                scores={writingCriteria}
                onChange={(k, v) => {
                  setWritingCriteria((prev) => ({ ...prev, [k]: v }));
                  setWritingSuccess(null);
                }}
                readOnly={writingReadOnly}
              />

              <EvaluatorOverallBand
                overall={writingOverall}
                reviewStatus={writingReview.status}
              />

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                  Writing examiner notes
                </label>
                <textarea
                  value={writingNotes}
                  onChange={(e) => setWritingNotes(e.target.value)}
                  rows={3}
                  disabled={writingReadOnly}
                  className="w-full rounded-xl border border-[#E8EDF3] bg-white px-3 py-2 text-sm text-navy outline-none focus:border-cyan disabled:opacity-60"
                  placeholder="Notes included in the report email…"
                />
              </div>

              {writingReadOnly ? (
                <p className="text-sm font-light text-[#5A6B82]">
                  Writing review completed.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={writingBusy}
                    onClick={() => void saveWritingDraft()}
                    className="cursor-pointer rounded-full border border-[#E8EDF3] px-5 py-2.5 text-sm font-semibold text-navy disabled:opacity-50"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    disabled={writingBusy}
                    onClick={() => void approveWriting()}
                    className="cursor-pointer rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Save Writing band
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#94A3B8]">
              No essay submitted — writing left unscored.
            </p>
          )}
        </section>

        <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-5")}>
          <h2 className="font-display text-lg font-bold text-navy">
            Speaking review
          </h2>
          {detail.speaking ? (
            <div className="rounded-xl border border-[#E8EDF3] bg-[#F8FAFC] p-4 text-sm text-[#5A6B82]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
                Completion summary (no audio uploaded in v1)
              </p>
              <ul className="space-y-1">
                {detail.speaking.part1.map((p) => (
                  <li key={p.question_id}>
                    Part 1 · {p.question_id}: {p.duration_sec}s
                    {p.completed ? " · completed" : ""}
                  </li>
                ))}
                {detail.speaking.part2_completed ? (
                  <li>
                    Part 2: prep {detail.speaking.part2_prep_sec ?? 0}s · record{" "}
                    {detail.speaking.part2_record_sec ?? 0}s
                  </li>
                ) : null}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[#94A3B8]">No speaking answers recorded.</p>
          )}

          <EvaluatorCriteriaRubric scores={criteria} onChange={(k, v) => {
            setCriteria((prev) => ({ ...prev, [k]: v }));
            setSuccess(null);
          }} />

          <EvaluatorOverallBand overall={speakingOverall} />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
              Examiner notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[#E8EDF3] bg-white px-3 py-2 text-sm text-navy outline-none focus:border-cyan"
              placeholder="Notes included in the report email…"
            />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void saveSpeaking()}
            className="cursor-pointer rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save Speaking band
          </button>
        </section>

        <section className={cn(evaluatorCard, evaluatorCardPad, "space-y-4")}>
          <h2 className="font-display text-lg font-bold text-navy">Send report</h2>
          <p className="text-sm text-[#5A6B82]">
            Emails the full band report card (Listening, Reading, Writing, Speaking)
            to the student. Speaking must be scored first.
          </p>
          {detail.report_email_sent_at ? (
            <p className="flex items-center gap-2 text-sm text-teal">
              <Mail className="size-4" />
              Sent {new Date(detail.report_email_sent_at).toLocaleString()}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy || !canSendReport}
            onClick={() => void sendReport()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-cyan px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-4" />
            {detail.email
              ? `Send report to ${detail.email}`
              : "Email required to send report"}
          </button>
          {!canSendReport && detail.email ? (
            <p className="text-xs text-[#94A3B8]">
              Score Speaking and ensure Writing band is available before sending.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
