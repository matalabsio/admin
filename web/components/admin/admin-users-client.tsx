"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnSecondary,
  adminAvatar,
  adminCard,
  adminFilterPill,
  adminFilterPillActive,
  adminLink,
  adminMeta,
  adminMutedLabel,
  adminStatusBadgeStyles,
  adminSrNo,
  adminSrTd,
  adminSrTh,
  adminTable,
  adminTableHead,
} from "@/components/admin/admin-ui";
import { adminApi, type AdminUserListItem } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type UsersView = "all" | "active7d" | "signups7d" | "attempts";

function normalizeView(raw?: string): UsersView {
  if (raw === "active7d" || raw === "signups7d" || raw === "attempts") return raw;
  return "all";
}

function isWithin7d(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= WEEK_MS;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

const VIEW_COPY: Record<UsersView, { title: string; subtitle: string }> = {
  all: { title: "Users", subtitle: "All registered students" },
  active7d: {
    title: "Active users (7d)",
    subtitle: "Unique accounts with activity in the last 7 days",
  },
  signups7d: {
    title: "New signups (7d)",
    subtitle: "Accounts created in the last 7 days",
  },
  attempts: {
    title: "Mock attempts",
    subtitle: "Students ranked by mock attempt count",
  },
};

type Props = { initialView?: string };

export function AdminUsersClient({ initialView }: Props) {
  const router = useRouter();
  const [view, setView] = useState<UsersView>(normalizeView(initialView));
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [sort, setSort] = useState<"latest" | "active" | "band" | "attempts">(
    normalizeView(initialView) === "attempts" ? "attempts" : "latest",
  );
  const [downloading, setDownloading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const copy = VIEW_COPY[view];

  const downloadCsv = async () => {
    setDownloading(true);
    setError(null);
    try {
      await adminApi.downloadUsersOverviewCsv();
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV download failed");
    } finally {
      setDownloading(false);
    }
  };

  const selectView = (next: UsersView) => {
    setView(next);
    setPage(1);
    if (next === "attempts") setSort("attempts");
    else if (next === "active7d") setSort("active");
    else setSort("latest");
    const params = new URLSearchParams();
    if (next !== "all") params.set("view", next);
    const qs = params.toString();
    router.replace(qs ? `/admin/users?${qs}` : "/admin/users", { scroll: false });
  };

  const load = useCallback(async (search?: string, pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listUsers({
        q: search || undefined,
        page: pageNum,
        page_size: PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(q, page);
  }, [load, page]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load(q, 1);
  };

  const active7d = useMemo(
    () => items.filter((u) => isWithin7d(u.last_activity_at)).length,
    [items],
  );

  const signups7d = useMemo(
    () => items.filter((u) => isWithin7d(u.created_at)).length,
    [items],
  );

  const shown = useMemo(() => {
    let rows = items.filter((u) =>
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? u.is_active
          : !u.is_active,
    );
    if (view === "active7d") {
      rows = rows.filter((u) => isWithin7d(u.last_activity_at));
    } else if (view === "signups7d") {
      rows = rows.filter((u) => isWithin7d(u.created_at));
    } else if (view === "attempts") {
      rows = rows.filter((u) => u.mock_attempt_count > 0);
    }
    rows = [...rows].sort((a, b) => {
      if (sort === "band") return (b.best_band ?? -1) - (a.best_band ?? -1);
      if (sort === "active") {
        return (
          new Date(b.last_activity_at ?? 0).getTime() -
          new Date(a.last_activity_at ?? 0).getTime()
        );
      }
      if (sort === "attempts") {
        return b.mock_attempt_count - a.mock_attempt_count;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return rows;
  }, [items, sort, statusFilter, view]);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        eyebrow="Users"
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <button
            type="button"
            className={adminBtnSecondary}
            onClick={() => void downloadCsv()}
            disabled={downloading}
          >
            <Download className="size-3.5" aria-hidden />
            {downloading ? "Downloading…" : "Download CSV"}
          </button>
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            { id: "all" as const, label: "Total", value: total },
            { id: "active7d" as const, label: "Active 7d", value: active7d },
            {
              id: "attempts" as const,
              label: "Mock attempts",
              value: items.reduce((s, u) => s + u.mock_attempt_count, 0),
            },
            {
              id: "signups7d" as const,
              label: "New signups 7d",
              value: signups7d,
            },
          ] as const
        ).map((card) => {
          const active = view === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => selectView(card.id)}
              className={cn(
                adminCard,
                "cursor-pointer text-left transition-colors",
                active
                  ? "border-cyan bg-cyan-soft/30 ring-2 ring-cyan/30"
                  : "hover:border-cyan/40 hover:bg-cyan-soft/10",
              )}
              aria-pressed={active}
            >
              <p className={adminMutedLabel}>{card.label}</p>
              <p className="mt-1 font-mono text-2xl font-medium text-navy tabular-nums">
                {card.value}
              </p>
            </button>
          );
        })}
      </section>
      <form className={cn(adminCard, "space-y-3")} onSubmit={onSearch}>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email or name"
            className="w-full rounded-[12px] border border-[#E4E9F0] bg-[#FBFCFD] py-2.5 pl-9 pr-3 text-sm text-navy placeholder:text-[#94A3B8] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All statuses" },
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id as typeof statusFilter)}
              className={cn(
                adminFilterPill,
                statusFilter === item.id && adminFilterPillActive,
              )}
            >
              {item.label}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className={cn(adminFilterPill, "cursor-pointer")}
          >
            <option value="latest">Sort: Latest</option>
            <option value="active">Sort: Last active</option>
            <option value="attempts">Sort: Attempts</option>
            <option value="band">Sort: Best band</option>
          </select>
        </div>
      </form>

      {error ? (
        <p className="text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-gray-600">Loading users…</p>
      ) : shown.length === 0 ? (
        <p className="text-gray-600">No users found.</p>
      ) : (
        <div className={adminTable}>
          <table className="w-full min-w-[900px] text-left text-sm text-black">
            <thead className={adminTableHead}>
              <tr>
                <th className={adminSrTh}>#</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Current band</th>
                <th className="px-4 py-3">Last active</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((user, index) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className={adminSrTd}>{adminSrNo(page, index, PAGE_SIZE)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={adminAvatar}>
                        {(
                          user.full_name?.slice(0, 2) ||
                          user.email?.slice(0, 2) ||
                          "ST"
                        ).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-semibold text-navy">
                          {user.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-[#5A6B82]">{user.email ?? "—"}</p>
                      </div>
                    </div>
                    <p className={cn(adminMeta, "mt-0.5 capitalize")}>{user.role}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-700">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{user.mock_attempt_count}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {user.best_band != null ? user.best_band.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatRelative(user.last_activity_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        user.is_active
                          ? adminStatusBadgeStyles.completed
                          : adminStatusBadgeStyles.inactive,
                      )}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${user.id}`} className={adminLink}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3">
          <p className={adminMeta}>
            Page {page} of {totalPages} · {total} users
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={adminBtnSecondary}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={adminBtnSecondary}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
