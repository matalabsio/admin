"use client";

import { useCallback, useEffect, useState } from "react";
import { adminTable, adminTableHead } from "@/components/admin/admin-ui";
import { adminApi, type AuditLogItem } from "@/lib/admin-api";

export function AdminAuditClient() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listAuditLogs();
      setItems(res.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-gray-600">Loading audit log…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className={adminTable}>
      <table className="w-full text-left text-sm text-black">
        <thead className={adminTableHead}>
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Admin</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Resource</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-600">
                No audit entries
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 text-xs whitespace-nowrap text-gray-600">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{row.admin_email ?? row.admin_id}</td>
                <td className="px-4 py-3">{row.action}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {row.resource_type}
                  {row.resource_id ? ` · ${row.resource_id.slice(0, 8)}…` : ""}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
