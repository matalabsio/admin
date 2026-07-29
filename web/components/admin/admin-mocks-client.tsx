"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { AdminCreateMockForm } from "@/components/admin/admin-create-mock-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminFilterPill,
  adminFilterPillActive,
  adminMeta,
  adminMutedLabel,
  adminStatusBadgeStyles,
  adminSubtext,
} from "@/components/admin/admin-ui";
import { adminApi, type AdminMockListItem } from "@/lib/admin-api";
import { isLiveCatalogNumber } from "@/lib/mock-catalog-api";
import { cn } from "@/lib/utils";

function isAdminLiveMock(mock: AdminMockListItem): boolean {
  return (
    mock.status === "published" &&
    mock.catalog_number != null &&
    isLiveCatalogNumber(mock.catalog_number)
  );
}

export function AdminMocksClient() {
  const router = useRouter();
  const [mocks, setMocks] = useState<AdminMockListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMocks(await adminApi.listMocks());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mocks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mocks
      .filter((m) => {
        if (statusFilter !== "all" && m.status !== statusFilter) return false;
        if (!q) return true;
        return (
          m.title.toLowerCase().includes(q) ||
          (m.description ?? "").toLowerCase().includes(q) ||
          String(m.catalog_number ?? "").includes(q)
        );
      })
      .sort((a, b) => (a.catalog_number ?? 999) - (b.catalog_number ?? 999));
  }, [mocks, search, statusFilter]);
  const liveMocks = filtered.filter(isAdminLiveMock);
  const draftMocks = filtered.filter((m) => m.status === "draft");
  const otherMocks = filtered.filter(
    (m) => !isAdminLiveMock(m) && m.status !== "draft",
  );

  const archiveMock = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await adminApi.patchMockStatus(id, "archived");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setBusyId(null);
    }
  };

  const publishMock = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await adminApi.patchMockStatus(id, "published");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-gray-600">Loading mocks…</p>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Content / Mock library"
        title="Mock tests"
        subtitle="Manage catalog visibility and section readiness."
        actions={
          <>
            <Link href="/dashboard" className={cn(adminBtnSecondary, "w-full sm:w-auto")}>
              Student view
            </Link>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className={cn(adminBtnPrimary, "w-full sm:w-auto")}
            >
              {showCreate ? "Hide form" : "Create mock"}
            </button>
          </>
        }
      />
      {error ? <p className="text-red-600">{error}</p> : null}
      {showCreate ? (
        <AdminCreateMockForm
          onCancel={() => setShowCreate(false)}
          onCreated={({ id }) => {
            setShowCreate(false);
            router.push(`/admin/mocks/${id}`);
          }}
        />
      ) : null}
      <div className={cn(adminCard, "space-y-3")}>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, or test number"
            className="w-full rounded-[12px] border border-[#E4E9F0] bg-[#FBFCFD] py-2.5 pl-9 pr-3 text-sm text-navy placeholder:text-[#94A3B8] focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All statuses" },
            { id: "published", label: "Live" },
            { id: "draft", label: "Draft" },
            { id: "archived", label: "Archived" },
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
        </div>
      </div>

      {liveMocks.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy">
            <span className="size-2 rounded-full bg-[#15935B]" />
            Live mock tests
            <span className={adminMutedLabel}>{liveMocks.length}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {liveMocks.map((mock) => (
              <MockCard
                key={mock.id}
                mock={mock}
                busyId={busyId}
                onArchive={archiveMock}
                onPublish={publishMock}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className={adminCard}>
          <p className={adminSubtext}>No live mock tests yet.</p>
        </div>
      )}
      {draftMocks.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy">
            <span className="size-2 rounded-full bg-[#94A3B8]" />
            Draft mock tests
            <span className={adminMutedLabel}>{draftMocks.length}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {draftMocks.map((mock) => (
              <MockCard
                key={mock.id}
                mock={mock}
                busyId={busyId}
                onArchive={archiveMock}
                onPublish={publishMock}
              />
            ))}
          </div>
        </section>
      ) : null}

      {otherMocks.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-navy">
            <span className="size-2 rounded-full bg-amber-500" />
            Other mocks
            <span className={adminMutedLabel}>{otherMocks.length}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {otherMocks.map((mock) => (
              <MockCard
                key={mock.id}
                mock={mock}
                busyId={busyId}
                onArchive={archiveMock}
                onPublish={publishMock}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MockCard({
  mock,
  busyId,
  onArchive,
  onPublish,
}: {
  mock: AdminMockListItem;
  busyId: string | null;
  onArchive: (id: string) => void;
  onPublish: (id: string) => void;
}) {
  const isLive = mock.status === "published";
  return (
    <article className={cn(adminCard, "flex flex-col gap-4 p-6")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          {mock.catalog_number ? (
            <p className={cn(adminMeta, "font-bold text-teal")}>Test {mock.catalog_number}</p>
          ) : null}
          <h3 className="font-display text-xl font-bold text-navy">{mock.title}</h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            adminStatusBadgeStyles[
              isLive ? "live" : mock.status === "draft" ? "draft" : "archived"
            ],
          )}
        >
          {isLive ? "Live" : mock.status}
        </span>
      </div>
      <p className="font-mono text-[28px] font-medium text-cyan">{mock.total_questions}</p>
      <p className={adminMutedLabel}>Questions</p>
      <div className={cn("flex flex-wrap gap-2 text-xs text-[#5A6B82]")}>
        {mock.modules.map((m) => (
          <span key={m.module}>
            {m.module} {m.question_count}Q
          </span>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 pt-2">
        <Link
          href={`/admin/mocks/${mock.id}`}
          className={cn(adminBtnSecondary, "px-2 py-2 text-xs")}
        >
          Details
        </Link>
        <Link
          href={`/admin/mocks/${mock.id}/ingest`}
          className={cn(adminBtnSecondary, "px-2 py-2 text-xs")}
        >
          Ingest
        </Link>
        <Link
          href={`/admin/mocks/${mock.id}/questions`}
          className={cn(adminBtnSecondary, "px-2 py-2 text-xs")}
        >
          Questions
        </Link>
      </div>
      <div className="border-t border-[#EDF1F6] pt-3">
        {isLive ? (
          <button
            type="button"
            disabled={busyId === mock.id}
            onClick={() => void onArchive(mock.id)}
            className="w-full cursor-pointer rounded-[11px] border border-[#FBCACA] bg-[#FFF2F2] px-3 py-2 text-xs font-bold text-[#B42318]"
          >
            Archive
          </button>
        ) : (
          <button
            type="button"
            disabled={busyId === mock.id || mock.status === "archived"}
            onClick={() => void onPublish(mock.id)}
            className={cn(adminBtnPrimary, "w-full py-2 text-xs")}
          >
            Publish
          </button>
        )}
      </div>
    </article>
  );
}
