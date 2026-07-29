"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  FileText,
  type LucideIcon,
  Mic,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  AdminChartCard,
  HorizontalBarChart,
  MockCatalogCard,
  UserGrowthChart,
  WeeklyActivityChart,
  type BarItem,
  type CatalogModuleStat,
} from "@/components/admin/admin-charts";
import { AdminCreateMockForm } from "@/components/admin/admin-create-mock-form";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminLink,
  adminMutedLabel,
} from "@/components/admin/admin-ui";
import { adminApi, type AdminMockListItem, type DashboardOverview } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function activityDotClass(kind: string): string {
  if (kind === "signup") return "bg-cyan";
  if (kind === "mock_attempt") return "bg-navy";
  if (kind === "speaking_review") return "bg-[#B7791F]";
  return "bg-[#94A3B8]";
}

function sumModuleQuestions(mocks: AdminMockListItem[], module: string): number {
  return mocks.reduce((sum, mock) => {
    const mod = mock.modules.find((m) => m.module === module);
    return sum + (mod?.question_count ?? 0);
  }, 0);
}

const CATALOG_MODULES = ["listening", "reading", "writing", "speaking"] as const;
const RECENT_ACTIVITY_INITIAL = 5;
const RECENT_ACTIVITY_PAGE = 5;

function mockIsLive(mock: AdminMockListItem): boolean {
  return mock.is_published && mock.catalog_number != null;
}

function mockHasModule(mock: AdminMockListItem, module: string): boolean {
  return mock.modules.some((m) => m.module === module && m.is_enabled);
}

function mockIsFullTest(mock: AdminMockListItem): boolean {
  return CATALOG_MODULES.every((m) => mockHasModule(mock, m));
}

function catalogModuleStat(
  mocks: AdminMockListItem[],
  module: string,
): CatalogModuleStat {
  let live = 0;
  let soon = 0;
  for (const mock of mocks) {
    if (!mockHasModule(mock, module)) continue;
    if (mockIsLive(mock)) live += 1;
    else soon += 1;
  }
  return { label: module, live, soon };
}

function mockStatusBadge(status: string): {
  label: string;
  className: string;
  dot: string;
} {
  if (status === "published") {
    return {
      label: "PUBLISHED",
      className: "bg-[#E7F7EE] text-[#15935B]",
      dot: "#15935B",
    };
  }
  if (status === "archived") {
    return {
      label: "ARCHIVED",
      className: "bg-[#F1F4F8] text-[#94A3B8]",
      dot: "#94A3B8",
    };
  }
  return {
    label: "DRAFT",
    className: "bg-[#FBF1D9] text-[#B7791F]",
    dot: "#B7791F",
  };
}

function mockModuleLabel(mock: AdminMockListItem): string {
  if (mockIsFullTest(mock)) return "Full test";
  const first = mock.modules.find((m) => m.is_enabled);
  if (!first) return "—";
  return first.module.charAt(0).toUpperCase() + first.module.slice(1);
}

function HeroStat({
  label,
  value,
  trendPct,
}: {
  label: string;
  value: string | number;
  trendPct?: number | null;
}) {
  return (
    <div className="flex h-full flex-col rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-3 sm:px-4">
      <p className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[#9FB0C8] sm:text-[10.5px] sm:tracking-[0.12em]">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-xl font-medium leading-none tabular-nums text-white sm:text-[26px]">
        {value}
      </p>
      {trendPct != null ? (
        <p className="mt-auto flex flex-wrap items-center gap-x-1 pt-2 text-[11px] sm:text-[11.5px]">
          <TrendingUp className="size-3 shrink-0 text-cyan" strokeWidth={2.6} aria-hidden />
          <span className="font-semibold text-cyan">
            {trendPct >= 0 ? "" : "-"}
            {Math.abs(trendPct)}%
          </span>
          <span className="hidden font-light text-[#7689A0] sm:inline">vs last week</span>
        </p>
      ) : null}
    </div>
  );
}

function QuickActionCard({
  href,
  Icon,
  title,
  subtitle,
}: {
  href: string;
  Icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        adminCard,
        "group flex flex-col p-4 transition hover:-translate-y-0.5 sm:p-[22px]",
      )}
    >
      <span className="mb-7 flex size-11 items-center justify-center rounded-xl bg-[#E6F6F8] sm:mb-[34px]">
        <Icon className="size-[22px] text-cyan" strokeWidth={2} aria-hidden />
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="block font-display text-base font-bold text-navy">{title}</span>
          <span className="mt-0.5 block text-xs text-[#94A3B8]">{subtitle}</span>
        </span>
        <ArrowRight
          className="size-[18px] shrink-0 text-[#CBD4DF] transition-colors group-hover:text-cyan"
          aria-hidden
        />
      </span>
    </Link>
  );
}

export function AdminDashboardClient() {
  const router = useRouter();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [mocks, setMocks] = useState<AdminMockListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [recentActivityVisible, setRecentActivityVisible] = useState(RECENT_ACTIVITY_INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ov, mockList] = await Promise.all([
          adminApi.dashboardOverview(),
          adminApi.listMocks(),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setMocks(mockList);
          setRecentActivityVisible(RECENT_ACTIVITY_INITIAL);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveMocks = useMemo(
    () => mocks.filter((m) => m.is_published && m.catalog_number != null),
    [mocks],
  );
  const liveCount = liveMocks.length;
  const comingSoonCount = Math.max(0, 6 - liveCount);

  const moduleBars: BarItem[] = useMemo(
    () => [
      {
        label: "listening",
        value: sumModuleQuestions(liveMocks, "listening"),
        color: "#00BCD4",
      },
      {
        label: "reading",
        value: sumModuleQuestions(liveMocks, "reading"),
        color: "#00BCD4",
      },
      {
        label: "writing",
        value: sumModuleQuestions(liveMocks, "writing"),
        color: "#00BCD4",
      },
      {
        label: "speaking",
        value: sumModuleQuestions(liveMocks, "speaking"),
        color: "#00BCD4",
      },
    ],
    [liveMocks],
  );

  const catalogModules: CatalogModuleStat[] = useMemo(() => {
    const base = CATALOG_MODULES.map((m) => catalogModuleStat(mocks, m));
    const full = mocks.reduce(
      (acc, mock) => {
        if (!mockIsFullTest(mock)) return acc;
        if (mockIsLive(mock)) acc.live += 1;
        else acc.soon += 1;
        return acc;
      },
      { label: "Full tests", live: 0, soon: 0 } as CatalogModuleStat,
    );
    return [...base, full];
  }, [mocks]);

  const recentMocks = useMemo(
    () =>
      [...mocks]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [mocks],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-[22px] bg-navy/10" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-[18px] bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className={cn(adminCard, "border-rose-200 bg-rose-50 text-rose-800")}>
        <p className="font-semibold">Could not load dashboard</p>
        <p className="mt-1 text-sm">{error ?? "Unknown error"}</p>
      </div>
    );
  }

  const { metrics, weekly_activity, recent_activity } = overview;
  const visibleRecentActivity = recent_activity.slice(0, recentActivityVisible);
  const hasMoreRecentActivity = recent_activity.length > recentActivityVisible;
  const remainingRecentActivity = recent_activity.length - recentActivityVisible;
  const speakingPending = metrics.speaking_pending ?? 0;
  const writingPending = metrics.writing_pending ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-[22px] bg-navy px-6 py-7 text-white sm:px-8 sm:py-8"
        aria-labelledby="admin-hero-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,188,212,0.18),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 top-0 flex gap-1 opacity-[0.12]"
          aria-hidden
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-3 rounded-sm bg-cyan"
              style={{ height: `${48 + i * 18}px`, marginTop: `${i * 6}px` }}
            />
          ))}
        </div>

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-cyan">
              {greeting()}, Admin
            </p>
            <h1
              id="admin-hero-heading"
              className="mt-2 font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] sm:text-[2rem]"
            >
              BandForge control center
            </h1>
            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:max-w-md sm:gap-3">
              <HeroStat
                label="Users"
                value={metrics.total_users.toLocaleString()}
                trendPct={metrics.users_trend_pct}
              />
              <HeroStat
                label="Mocks"
                value={metrics.total_mocks ?? mocks.length}
                trendPct={metrics.mocks_trend_pct}
              />
              <HeroStat label="Live tests" value={liveCount} />
            </div>
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row lg:w-auto">
            <button
              type="button"
              className={cn(adminBtnPrimary, "w-full sm:w-auto")}
              onClick={() => setShowCreateForm((v) => !v)}
            >
              <Plus className="mr-1.5 size-4" aria-hidden />
              {showCreateForm ? "Hide form" : "Create mock"}
            </button>
            <Link
              href="/admin/mocks"
              className={cn(
                adminBtnSecondary,
                "w-full border-white/20 bg-white/10 text-white hover:bg-white/15 sm:w-auto",
              )}
            >
              Manage mocks
            </Link>
          </div>
        </div>
      </section>

      {showCreateForm ? (
        <AdminCreateMockForm
          onCancel={() => setShowCreateForm(false)}
          onCreated={({ id }) => {
            setShowCreateForm(false);
            router.push(`/admin/mocks/${id}`);
          }}
        />
      ) : null}

      {/* KPI row */}
      <section
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
        aria-label="Key metrics"
      >
        <AdminKpiCard
          label="Total users"
          value={metrics.total_users.toLocaleString()}
          hint="All registered accounts"
          Icon={Users}
          trendPct={metrics.users_trend_pct}
        />
        <AdminKpiCard
          label="Active (7d)"
          value={metrics.active_users_7d.toLocaleString()}
          hint="Unique logins this week"
          Icon={Activity}
          trendPct={metrics.users_trend_pct}
        />
        <AdminKpiCard
          label="New signups"
          value={metrics.new_signups_7d.toLocaleString()}
          hint="Last 7 days"
          Icon={UserPlus}
          trendPct={metrics.signups_trend_pct}
        />
        <AdminKpiCard
          label="Mock attempts"
          value={metrics.mock_attempts_7d.toLocaleString()}
          hint="Last 7 days"
          Icon={ClipboardList}
          trendPct={metrics.mocks_trend_pct}
        />
        <AdminKpiCard
          label="Speaking reviews"
          value={speakingPending.toLocaleString()}
          hint="Awaiting examiner"
          Icon={Mic}
          accent="amber"
          badge={speakingPending > 0 ? "Pending" : undefined}
          href="/admin/speaking"
        />
        <AdminKpiCard
          label="Writing reviews"
          value={writingPending.toLocaleString()}
          hint="Awaiting examiner"
          Icon={FileText}
          accent="amber"
          badge={writingPending > 0 ? "Pending" : undefined}
          href="/admin/writing"
        />
      </section>

      {/* Chart row 1 */}
      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <AdminChartCard
          title="Weekly activity"
          subtitle="Signups and mock attempts — last 7 days"
          headerExtra={
            <div className="hidden items-center gap-4 text-[11px] font-semibold sm:flex">
              <span className="flex items-center gap-1.5 text-[#5A6B82]">
                <span className="size-2 rounded-full bg-cyan" aria-hidden />
                Signups
              </span>
              <span className="flex items-center gap-1.5 text-[#5A6B82]">
                <span className="size-2 rounded-full bg-navy" aria-hidden />
                Mock attempts
              </span>
            </div>
          }
        >
          <WeeklyActivityChart data={weekly_activity} />
        </AdminChartCard>
        <MockCatalogCard
          liveCount={liveCount}
          comingSoonCount={comingSoonCount}
          modules={catalogModules}
        />
      </section>

      {/* Chart row 2 */}
      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <AdminChartCard
          title="User growth"
          subtitle="Daily signups this week"
          headerExtra={
            metrics.signups_trend_pct != null ? (
              <span className="rounded-full bg-[#E0F5F8] px-2.5 py-1 text-[11px] font-bold text-teal">
                {metrics.signups_trend_pct >= 0 ? "+" : ""}
                {metrics.signups_trend_pct}% vs prior week
              </span>
            ) : null
          }
        >
          <UserGrowthChart data={weekly_activity} trendPct={metrics.signups_trend_pct} />
        </AdminChartCard>

        <div className={cn(adminCard, "flex h-full min-w-0 flex-col")}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[17px] font-bold text-navy">Recent activity</h3>
              <p className="mt-0.5 text-[12.5px] text-[#94A3B8]">Latest platform events</p>
            </div>
            <span className="flex items-center gap-1.5">
              <span className="size-[7px] animate-pulse rounded-full bg-cyan" aria-hidden />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#94A3B8]">
                Live
              </span>
            </span>
          </div>
          {recent_activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#94A3B8]">No recent activity yet.</p>
          ) : (
            <>
              <ul className="space-y-0 divide-y divide-[#F1F4F8]">
                {visibleRecentActivity.map((item) => (
                  <li key={item.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        activityDotClass(item.kind),
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] leading-snug text-navy">{item.message}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-[#94A3B8]">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {hasMoreRecentActivity ? (
                <div className="mt-1 border-t border-[#F1F4F8] pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setRecentActivityVisible((count) =>
                        Math.min(count + RECENT_ACTIVITY_PAGE, recent_activity.length),
                      )
                    }
                    className="w-full cursor-pointer rounded-[11px] border border-[#EAEEF3] bg-white py-2.5 text-[13px] font-semibold text-teal transition-colors hover:bg-cyan-soft/40"
                  >
                    View more
                    <span className="font-medium text-[#94A3B8]">
                      {" "}
                      · {remainingRecentActivity} remaining
                    </span>
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* Row 3 */}
      <section className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <AdminChartCard
          title="Question bank"
          subtitle="Questions per module (live mocks)"
          className="min-w-0"
        >
          <HorizontalBarChart items={moduleBars} />
        </AdminChartCard>

        <div className={cn(adminCard, "flex h-full min-w-0 flex-col")}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[17px] font-bold text-navy">Recent mocks</h3>
              <p className="mt-0.5 text-[12.5px] text-[#94A3B8]">Latest catalog entries</p>
            </div>
            <Link href="/admin/mocks" className={adminLink}>
              View all
            </Link>
          </div>
          {recentMocks.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#94A3B8]">
              No mocks in catalog yet.
            </p>
          ) : (
            <>
              <div className="hidden items-center gap-3 border-b border-[#EDF1F6] pb-3 sm:flex">
                <span className={cn(adminMutedLabel, "flex-1")}>Test name</span>
                <span className={cn(adminMutedLabel, "w-16 text-right")}>Attempts</span>
                <span className={cn(adminMutedLabel, "w-24 text-right")}>Status</span>
              </div>
              <ul className="divide-y divide-[#F1F4F8]">
                {recentMocks.map((mock) => {
                  const badge = mockStatusBadge(mock.status);
                  const attempts = mock.attempt_count ?? 0;
                  return (
                    <li
                      key={mock.id}
                      className="flex items-center gap-3 py-3.5 first:pt-3.5 sm:first:pt-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/mocks/${mock.id}`}
                          className="block truncate text-[13.5px] font-semibold text-navy hover:text-teal"
                        >
                          {mock.title}
                        </Link>
                        <span className="mt-0.5 block text-[11.5px] text-[#94A3B8]">
                          {mockModuleLabel(mock)}
                        </span>
                      </div>
                      <span className="hidden w-16 shrink-0 text-right font-mono text-[13px] tabular-nums text-[#5A6B82] sm:block">
                        {attempts > 0 ? attempts.toLocaleString() : "—"}
                      </span>
                      <span className="flex shrink-0 justify-end sm:w-24">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-[0.04em]",
                            badge.className,
                          )}
                        >
                          <span
                            className="size-[5px] rounded-full"
                            style={{ backgroundColor: badge.dot }}
                            aria-hidden
                          />
                          {badge.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[#94A3B8]"
        >
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="group relative flex flex-col overflow-hidden rounded-[18px] bg-navy p-4 text-left transition hover:-translate-y-0.5 sm:p-[22px]"
          >
            <span
              className="pointer-events-none absolute inset-y-0 right-0 w-3/5 bg-[linear-gradient(100deg,transparent,rgba(0,188,212,0.22))]"
              aria-hidden
            />
            <span className="relative mb-7 flex size-11 items-center justify-center rounded-xl bg-cyan sm:mb-[34px]">
              <Plus className="size-[22px] text-navy" strokeWidth={2.4} aria-hidden />
            </span>
            <span className="relative flex items-end justify-between gap-2">
              <span className="min-w-0">
                <span className="block font-display text-base font-bold text-white">
                  Create mock
                </span>
                <span className="mt-0.5 block text-xs text-[#9FB0C8]">Build a new test</span>
              </span>
              <ArrowRight className="size-[18px] shrink-0 text-cyan" aria-hidden />
            </span>
          </button>

          <QuickActionCard
            href="/admin/mocks"
            Icon={ClipboardList}
            title="Manage mocks"
            subtitle="Edit & publish"
          />
          <QuickActionCard
            href="/admin/speaking"
            Icon={Mic}
            title="Evaluator portal"
            subtitle={`${(speakingPending + writingPending).toLocaleString()} in review queue`}
          />
          <QuickActionCard
            href="/admin/users"
            Icon={Users}
            title="Users"
            subtitle={`${metrics.total_users.toLocaleString()} learners`}
          />
        </div>
      </section>
    </div>
  );
}
