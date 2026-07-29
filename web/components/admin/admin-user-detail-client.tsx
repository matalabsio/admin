"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  KeyRound,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { adminInitials } from "@/components/admin/admin-ui";
import {
  adminApi,
  type AdminUserMockSessionItem,
  type AdminUserOverview,
} from "@/lib/admin-api";
import { isLiveCatalogNumber } from "@/lib/mock-catalog-api";
import { cn } from "@/lib/utils";

type Props = { userId: string };

type SubmissionTab = "mock" | "writing" | "speaking";

type TimelineTone = "accent" | "warn" | "muted";

type TimelineEvent = {
  id: string;
  time: number;
  dateLabel: string;
  title: string;
  tone: TimelineTone;
};

type StatusTone = "completed" | "in_progress" | "pending";

const CARD =
  "rounded-[18px] border border-[#EAEEF3] bg-white shadow-[0_8px_22px_rgba(13,31,60,0.04)]";
const CARD_TITLE = "font-display text-[17px] font-bold text-navy";
const ROW =
  "flex items-center justify-between gap-3 border-b border-[#F1F4F8] py-[11px] last:border-b-0";
const ROW_LABEL = "text-[13.5px] font-light text-[#5A6B82]";
const ROW_VALUE = "font-mono text-sm font-medium text-navy";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })} · ${d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "—";
  }
}

function bandLabel(band: number | null | undefined): string {
  if (band == null) return "—";
  return band.toFixed(1);
}

function liveMockSessions(sessions: AdminUserMockSessionItem[]) {
  return sessions.filter(
    (s) => s.catalog_number != null && isLiveCatalogNumber(s.catalog_number),
  );
}

const STATUS_STYLES: Record<StatusTone, { wrap: string; dot: string; label: string }> = {
  completed: { wrap: "bg-[#E7F7EE] text-[#15935B]", dot: "bg-[#15935B]", label: "COMPLETED" },
  in_progress: { wrap: "bg-[#E5EEF9] text-[#3B6FB0]", dot: "bg-[#3B6FB0]", label: "IN PROGRESS" },
  pending: { wrap: "bg-[#FBF1D9] text-[#B7791F]", dot: "bg-[#B7791F]", label: "PENDING" },
};

function StatusPill({ tone, label }: { tone: StatusTone; label?: string }) {
  const s = STATUS_STYLES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] justify-self-end rounded-full px-[10px] py-1 text-[10.5px] font-bold",
        s.wrap,
      )}
    >
      <span className={cn("size-[5px] rounded-full", s.dot)} />
      {label ?? s.label}
    </span>
  );
}

function mockStatusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s === "completed") return "completed";
  if (s === "in_progress") return "in_progress";
  return "pending";
}

function reviewStatusTone(status: string, band: number | null): StatusTone {
  const s = status.toLowerCase();
  if (s === "completed" || s === "reviewed" || band != null) return "completed";
  if (s === "in_review") return "in_progress";
  return "pending";
}

function reviewStatusLabel(status: string, band: number | null): string {
  const tone = reviewStatusTone(status, band);
  if (tone === "completed") return "REVIEWED";
  if (tone === "in_progress") return "IN REVIEW";
  return "PENDING";
}

function BandCell({ band, accent = false }: { band: number | null; accent?: boolean }) {
  return (
    <span
      className={cn(
        "text-center font-mono text-[13px]",
        band == null ? "text-[#94A3B8]" : accent ? "text-[14px] font-medium text-teal" : "text-navy",
      )}
    >
      {bandLabel(band)}
    </span>
  );
}

const TONE_DOT: Record<TimelineTone, string> = {
  accent: "bg-cyan shadow-[0_0_0_1px_#C7EBF0]",
  warn: "bg-[#E0A93B] shadow-[0_0_0_1px_#F3E3C0]",
  muted: "bg-[#CBD4DF] shadow-[0_0_0_1px_#EDF1F6]",
};

export function AdminUserDetailClient({ userId }: Props) {
  const [overview, setOverview] = useState<AdminUserOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [submissionTab, setSubmissionTab] = useState<SubmissionTab>("mock");

  const load = useCallback(async () => {
    setError(null);
    try {
      setOverview(await adminApi.getUserOverview(userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mockSessions = useMemo(
    () => (overview ? liveMockSessions(overview.mock_sessions) : []),
    [overview],
  );

  const writingRows = useMemo(
    () => (overview ? overview.recent_modules.filter((m) => m.module === "writing") : []),
    [overview],
  );

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!overview) return [];
    const events: TimelineEvent[] = [];

    for (const s of mockSessions) {
      if (s.completed_at) {
        events.push({
          id: `mock-done-${s.mock_attempt_id}`,
          time: new Date(s.completed_at).getTime(),
          dateLabel: formatDateTime(s.completed_at),
          title: `Completed ${s.mock_title ?? "mock test"}${
            s.aggregate_band != null ? ` — Band ${bandLabel(s.aggregate_band)}` : ""
          }`,
          tone: "accent",
        });
      }
      events.push({
        id: `mock-start-${s.mock_attempt_id}`,
        time: new Date(s.started_at).getTime(),
        dateLabel: formatDateTime(s.started_at),
        title: `Started ${s.mock_title ?? "mock test"}`,
        tone: "muted",
      });
    }

    for (const r of overview.speaking_reviews) {
      const pending = !(r.status === "completed" || r.human_band != null);
      events.push({
        id: `speaking-${r.id}`,
        time: new Date(r.created_at).getTime(),
        dateLabel: formatDateTime(r.created_at),
        title: pending
          ? "Speaking awaiting examiner review"
          : `Speaking reviewed — Band ${bandLabel(r.human_band)}`,
        tone: pending ? "warn" : "accent",
      });
    }

    for (const d of overview.diagnostics) {
      if (!d.completed_at) continue;
      events.push({
        id: `diag-${d.id}`,
        time: new Date(d.completed_at).getTime(),
        dateLabel: formatDateTime(d.completed_at),
        title: `Completed diagnostic${
          d.aggregate_band != null ? ` — Band ${bandLabel(d.aggregate_band)}` : ""
        }`,
        tone: "accent",
      });
    }

    if (overview.profile.created_at) {
      events.push({
        id: "registered",
        time: new Date(overview.profile.created_at).getTime(),
        dateLabel: formatDateTime(overview.profile.created_at),
        title: "Registered",
        tone: "muted",
      });
    }

    return events.sort((a, b) => b.time - a.time).slice(0, 8);
  }, [overview, mockSessions]);

  const summary = useMemo(() => {
    if (!overview) {
      return { current: null as number | null, trend: null as number | null, diagnostic: null as number | null, latestMock: null as number | null };
    }
    const latestMock =
      mockSessions.find((s) => s.aggregate_band != null)?.aggregate_band ?? null;
    const diagnostic =
      overview.diagnostics.find((d) => d.aggregate_band != null)?.aggregate_band ?? null;
    const current = overview.stats.best_band ?? latestMock ?? null;
    const trend =
      current != null && diagnostic != null
        ? Math.round((current - diagnostic) * 10) / 10
        : null;
    return { current, trend, diagnostic, latestMock };
  }, [overview, mockSessions]);

  // Study hours: estimated from completed module attempts (no time-tracking source).
  const studyHours = useMemo<number | null>(() => {
    if (!overview) return null;
    const MODULE_MINUTES: Record<string, number> = {
      listening: 30,
      reading: 60,
      writing: 60,
      speaking: 15,
    };
    const minutes = overview.recent_modules.reduce(
      (sum, m) => sum + (MODULE_MINUTES[m.module] ?? 30),
      0,
    );
    if (minutes <= 0) return null;
    return Math.round(minutes / 60);
  }, [overview]);

  // No billing model yet — expiry is not tracked server-side.
  const planExpiresLabel = "—";

  const resetPassword = async () => {
    if (!overview?.profile.email) return;
    setActionNote(
      `Password-reset email flow isn’t wired up yet — share ${overview.profile.email} with the auth team.`,
    );
  };

  const setActive = async (isActive: boolean) => {
    setActionNote(null);
    if (!isActive && !confirm("Suspend this account? They will not be able to sign in.")) {
      return;
    }
    setBusy(true);
    try {
      await adminApi.patchUser(userId, { is_active: isActive });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update account");
    } finally {
      setBusy(false);
    }
  };

  if (error && !overview) {
    return <p className="text-danger">{error}</p>;
  }

  if (!overview) {
    return (
      <div className="grid gap-[22px] lg:grid-cols-[60fr_40fr]" aria-busy>
        <div className="space-y-[18px]">
          <div className="h-[126px] animate-pulse rounded-[18px] bg-white" />
          <div className="h-[320px] animate-pulse rounded-[18px] bg-white" />
        </div>
        <div className="space-y-[18px]">
          <div className="h-[280px] animate-pulse rounded-[18px] bg-white" />
          <div className="h-[160px] animate-pulse rounded-[18px] bg-white" />
        </div>
      </div>
    );
  }

  const { profile, stats } = overview;
  const displayName = profile.full_name ?? profile.email ?? "Unnamed user";
  const phoneDigits = profile.phone?.replace(/\D/g, "") ?? "";

  return (
    <div className="space-y-[18px]">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid items-start gap-[22px] lg:grid-cols-[60fr_40fr]">
        {/* ============ LEFT COLUMN ============ */}
        <div className="flex min-w-0 flex-col gap-[18px]">
          {/* student info */}
          <div className={cn(CARD, "flex items-center gap-[22px] px-7 py-[26px]")}>
            <div className="flex size-[74px] shrink-0 items-center justify-center rounded-full bg-cyan font-display text-[26px] font-bold text-white">
              {adminInitials(profile.full_name, profile.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-[26px] font-extrabold leading-none tracking-[-0.02em] text-navy">
                  {displayName}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-[11px] py-1 text-[11.5px] font-bold tracking-[0.03em]",
                    profile.is_active
                      ? "bg-navy text-white"
                      : "bg-[#FEE2E2] text-[#B91C1C]",
                  )}
                >
                  {profile.is_active ? "Active" : "Suspended"}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#F1F4F8] px-[11px] py-1 text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#5A6B82]">
                  {profile.role}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px] text-[#5A6B82]">
                <span className="inline-flex items-center gap-[6px]">
                  <Mail className="size-[15px] text-[#94A3B8]" />
                  {profile.email ?? "No email"}
                </span>
                <span className="inline-flex items-center gap-[6px]">
                  <Phone className="size-[15px] text-[#94A3B8]" />
                  {profile.phone ?? "No phone"}
                </span>
                <span className="inline-flex items-center gap-[6px]">
                  <Calendar className="size-[15px] text-[#94A3B8]" />
                  Joined {formatDate(profile.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* activity timeline */}
          <div className={cn(CARD, "px-7 py-6")}>
            <div className={cn(CARD_TITLE, "mb-5")}>Activity</div>
            {timeline.length === 0 ? (
              <p className="text-sm font-light text-[#5A6B82]">No activity recorded yet.</p>
            ) : (
              <div className="relative pl-[26px]">
                <div className="absolute bottom-[5px] left-[5px] top-[5px] w-0.5 bg-[#EDF1F6]" />
                {timeline.map((ev) => (
                  <div key={ev.id} className="relative flex gap-[14px] pb-[18px] last:pb-0">
                    <span
                      className={cn(
                        "absolute left-[-26px] top-[3px] size-3 rounded-full border-[2.5px] border-white",
                        TONE_DOT[ev.tone],
                      )}
                    />
                    <div>
                      <div className="mb-[3px] font-mono text-[11px] text-[#94A3B8]">
                        {ev.dateLabel}
                      </div>
                      <div
                        className={cn(
                          "text-[14px] font-medium",
                          ev.tone === "muted" ? "text-[#5A6B82]" : "text-navy",
                        )}
                      >
                        {ev.title}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* submissions tabs */}
          <div className={cn(CARD, "overflow-hidden")}>
            <div className="flex items-center gap-1 border-b border-[#EDF1F6] px-4 pt-1.5">
              {([
                { id: "mock", label: "Mock Attempts" },
                { id: "writing", label: "Writing Submissions" },
                { id: "speaking", label: "Speaking Submissions" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubmissionTab(tab.id)}
                  className={cn(
                    "cursor-pointer whitespace-nowrap border-b-[2.5px] px-4 py-[13px] text-[14px] transition-colors",
                    submissionTab === tab.id
                      ? "border-cyan font-bold text-navy"
                      : "border-transparent font-medium text-[#94A3B8] hover:text-[#5A6B82]",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {submissionTab === "mock" ? (
              mockSessions.length === 0 ? (
                <p className="px-[22px] py-6 text-sm font-light text-[#5A6B82]">
                  No live mock attempts yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-[1.7fr_1fr_0.5fr_0.5fr_0.5fr_0.5fr_0.8fr_1fr] items-center gap-[10px] border-b border-[#EDF1F6] px-[22px] py-[13px] font-mono text-[10px] uppercase tracking-[0.08em] text-[#94A3B8]">
                      <span>Test</span>
                      <span>Date</span>
                      <span className="text-center">L</span>
                      <span className="text-center">R</span>
                      <span className="text-center">W</span>
                      <span className="text-center">S</span>
                      <span className="text-center">Overall</span>
                      <span className="text-right">Status</span>
                    </div>
                    {mockSessions.map((s) => (
                      <div
                        key={s.mock_attempt_id}
                        className="grid grid-cols-[1.7fr_1fr_0.5fr_0.5fr_0.5fr_0.5fr_0.8fr_1fr] items-center gap-[10px] border-b border-[#F1F4F8] px-[22px] py-[14px] last:border-b-0"
                      >
                        <span className="text-[13.5px] font-semibold text-navy">
                          {s.mock_title ?? `Test ${s.catalog_number ?? ""}`.trim()}
                        </span>
                        <span className="text-[13px] text-[#5A6B82]">{formatDate(s.started_at)}</span>
                        <BandCell band={s.listening_band} />
                        <BandCell band={s.reading_band} />
                        <BandCell band={s.writing_band} />
                        <BandCell band={s.speaking_band} />
                        <BandCell band={s.aggregate_band} accent />
                        <StatusPill tone={mockStatusTone(s.status)} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : submissionTab === "writing" ? (
              writingRows.length === 0 ? (
                <p className="px-[22px] py-6 text-sm font-light text-[#5A6B82]">
                  No writing submissions yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[480px]">
                    <div className="grid grid-cols-[2fr_1fr_0.8fr_1fr] items-center gap-3 border-b border-[#EDF1F6] px-[22px] py-[13px] font-mono text-[10px] uppercase tracking-[0.08em] text-[#94A3B8]">
                      <span>Task</span>
                      <span>Date</span>
                      <span className="text-center">Band</span>
                      <span className="text-right">Status</span>
                    </div>
                    {writingRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[2fr_1fr_0.8fr_1fr] items-center gap-3 border-b border-[#F1F4F8] px-[22px] py-[14px] last:border-b-0"
                      >
                        <span className="text-[13.5px] font-semibold text-navy">
                          {row.mock_title ?? `Test ${row.catalog_number ?? ""}`.trim()} — Writing
                        </span>
                        <span className="text-[13px] text-[#5A6B82]">
                          {formatDate(row.completed_at ?? row.started_at)}
                        </span>
                        <BandCell band={row.band} accent />
                        <StatusPill
                          tone={reviewStatusTone(row.status, row.band)}
                          label={reviewStatusLabel(row.status, row.band)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : overview.speaking_reviews.length === 0 ? (
              <p className="px-[22px] py-6 text-sm font-light text-[#5A6B82]">
                No speaking submissions yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[480px]">
                  <div className="grid grid-cols-[2fr_1fr_0.8fr_1fr] items-center gap-3 border-b border-[#EDF1F6] px-[22px] py-[13px] font-mono text-[10px] uppercase tracking-[0.08em] text-[#94A3B8]">
                    <span>Mock</span>
                    <span>Date</span>
                    <span className="text-center">Band</span>
                    <span className="text-right">Status</span>
                  </div>
                  {overview.speaking_reviews.map((row) => (
                    <Link
                      key={row.id}
                      href={`/admin/speaking/${row.id}`}
                      className="grid grid-cols-[2fr_1fr_0.8fr_1fr] items-center gap-3 border-b border-[#F1F4F8] px-[22px] py-[14px] transition-colors last:border-b-0 hover:bg-[#FBFCFE]"
                    >
                      <span className="text-[13.5px] font-semibold text-navy">
                        {row.mock_title ?? "Speaking submission"}
                      </span>
                      <span className="text-[13px] text-[#5A6B82]">{formatDate(row.created_at)}</span>
                      <BandCell band={row.human_band} accent />
                      <StatusPill
                        tone={reviewStatusTone(row.status, row.human_band)}
                        label={reviewStatusLabel(row.status, row.human_band)}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ RIGHT COLUMN ============ */}
        <div className="flex min-w-0 flex-col gap-[18px]">
          {/* progress summary */}
          <div className={cn(CARD, "px-[26px] py-6")}>
            <div className={cn(CARD_TITLE, "mb-[18px]")}>Progress summary</div>
            <div className="mb-1.5 flex items-end gap-[14px] border-b border-[#F1F4F8] pb-[18px]">
              <div>
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#94A3B8]">
                  Current band
                </div>
                <div className="font-mono text-[48px] font-medium leading-[0.85] text-cyan">
                  {bandLabel(summary.current)}
                </div>
              </div>
              {summary.trend != null && summary.trend !== 0 ? (
                <div
                  className={cn(
                    "mb-1.5 inline-flex items-center gap-1 rounded-full px-[10px] py-1",
                    summary.trend > 0 ? "bg-[#E7F7EE]" : "bg-[#FEE2E2]",
                  )}
                >
                  <TrendingUp
                    className={cn(
                      "size-3",
                      summary.trend > 0 ? "text-[#15935B]" : "rotate-180 text-[#B91C1C]",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[11.5px] font-bold",
                      summary.trend > 0 ? "text-[#15935B]" : "text-[#B91C1C]",
                    )}
                  >
                    {summary.trend > 0 ? "+" : ""}
                    {summary.trend.toFixed(1)}
                  </span>
                </div>
              ) : null}
            </div>
            <div className={ROW}>
              <span className={ROW_LABEL}>Target band</span>
              <span className={ROW_VALUE}>{bandLabel(profile.target_band)}</span>
            </div>
            <div className={ROW}>
              <span className={ROW_LABEL}>Diagnostic score</span>
              <span className={ROW_VALUE}>{bandLabel(summary.diagnostic)}</span>
            </div>
            <div className={ROW}>
              <span className={ROW_LABEL}>Latest mock score</span>
              <span className={ROW_VALUE}>{bandLabel(summary.latestMock)}</span>
            </div>
            <div className={ROW}>
              <span className={ROW_LABEL}>Streak</span>
              <span className={ROW_VALUE}>
                {stats.current_streak} {stats.current_streak === 1 ? "day" : "days"}
              </span>
            </div>
            <div className={ROW}>
              <span className={ROW_LABEL}>Study hours</span>
              <span className={ROW_VALUE}>
                {studyHours != null ? `${studyHours}h` : "—"}
              </span>
            </div>
          </div>

          {/* plan & billing */}
          <div className={cn(CARD, "px-[26px] py-6")}>
            <div className={cn(CARD_TITLE, "mb-4")}>Plan &amp; billing</div>
            <div className={ROW}>
              <span className={ROW_LABEL}>Current plan</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-[11px] py-1 text-[11.5px] font-bold tracking-[0.03em]",
                  profile.is_active ? "bg-navy text-white" : "bg-[#FEE2E2] text-[#B91C1C]",
                )}
              >
                {profile.is_active ? "Live" : "Inactive"}
              </span>
            </div>
            <div className={ROW}>
              <span className={ROW_LABEL}>Purchased</span>
              <span className="text-[13.5px] font-semibold text-navy">
                {formatDate(profile.created_at)}
              </span>
            </div>
            <div className={ROW}>
              <span className={ROW_LABEL}>Expires</span>
              <span className="text-[13.5px] font-semibold text-navy">
                {planExpiresLabel}
              </span>
            </div>
          </div>

          {/* quick actions */}
          <div className={cn(CARD, "px-[26px] py-6")}>
            <div className={cn(CARD_TITLE, "mb-4")}>Quick actions</div>
            <div className="flex flex-col gap-[10px]">
              <a
                href={phoneDigits ? `https://wa.me/${phoneDigits}` : undefined}
                target={phoneDigits ? "_blank" : undefined}
                rel={phoneDigits ? "noreferrer" : undefined}
                aria-disabled={!phoneDigits}
                title={phoneDigits ? undefined : "No phone number on file"}
                onClick={(e) => {
                  if (!phoneDigits) e.preventDefault();
                }}
                className={cn(
                  "flex items-center justify-center gap-[9px] rounded-[11px] border-[1.5px] border-cyan bg-white px-3 py-3 text-[14px] font-semibold text-teal transition-colors",
                  phoneDigits
                    ? "cursor-pointer hover:bg-cyan-soft/40"
                    : "cursor-not-allowed opacity-50",
                )}
              >
                <MessageCircle className="size-4" />
                Send WhatsApp
              </a>
              <button
                type="button"
                onClick={() => void resetPassword()}
                disabled={busy || !profile.email}
                title={profile.email ? undefined : "No email on file"}
                className="flex cursor-pointer items-center justify-center gap-[9px] rounded-[11px] border-[1.5px] border-[#CDD7E2] bg-white px-3 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-cyan-soft/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <KeyRound className="size-4 text-[#5A6B82]" />
                Reset password
              </button>
              <Link
                href={`/admin/users/${userId}?action=plan`}
                className="flex cursor-pointer items-center justify-center gap-[9px] rounded-[11px] border-[1.5px] border-[#CDD7E2] bg-white px-3 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-cyan-soft/40"
              >
                <RefreshCw className="size-4 text-[#5A6B82]" />
                Change plan
              </Link>
              {profile.is_active ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setActive(false)}
                  className="flex cursor-pointer items-center justify-center gap-[9px] rounded-[11px] border-[1.5px] border-[#E9D0D1] bg-white px-3 py-3 text-[14px] font-semibold text-[#B4474B] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldOff className="size-4" />
                  Suspend account
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void setActive(true)}
                  className="flex cursor-pointer items-center justify-center gap-[9px] rounded-[11px] border-[1.5px] border-[#CDD7E2] bg-white px-3 py-3 text-[14px] font-semibold text-navy transition-colors hover:bg-cyan-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck className="size-4" />
                  Reactivate account
                </button>
              )}
              {actionNote ? (
                <p className="pt-1 text-center text-[12px] font-medium text-[#5A6B82]">
                  {actionNote}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
