"use client";

import { useEffect, useState } from "react";
import { api, type AuditLog } from "@/lib/api";

const LIMIT = 50;

const ACTIONS = [
  "job.featured",
  "user.verify",
  "service_request.featured",
  "provider.featured",
  "report.update",
];

const TARGET_TYPES = ["job", "user", "service_request", "provider", "report"];

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [adminIdFilter, setAdminIdFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .auditLog({
        limit: LIMIT,
        offset,
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        adminUserId: adminIdFilter || undefined,
      })
      .then((res) => {
        if (!cancelled) {
          setLogs(res.data ?? []);
          setTotal(res.total ?? 0);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offset, actionFilter, targetTypeFilter, adminIdFilter]);

  const page = Math.floor(offset / LIMIT) + 1;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const hasFilter = !!(actionFilter || targetTypeFilter || adminIdFilter);

  function resetFilters() {
    setActionFilter("");
    setTargetTypeFilter("");
    setAdminIdFilter("");
    setOffset(0);
  }

  async function downloadCsv() {
    try {
      const blob = await api.auditLogExport({
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        adminUserId: adminIdFilter || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.download = `audit-log-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function onFilterChange<T>(setter: (v: T) => void, v: T) {
    setter(v);
    setOffset(0);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Denetim Kaydı</h1>
      <p className="text-sm text-gray-500 mb-6">
        Admin tarafından yapılan tüm önemli aksiyonların kaydı
      </p>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select
          value={actionFilter}
          onChange={(e) => onFilterChange(setActionFilter, e.target.value)}
          className="border border-gray-200 rounded px-3 py-2 text-sm bg-white"
        >
          <option value="">Tüm aksiyonlar</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={targetTypeFilter}
          onChange={(e) => onFilterChange(setTargetTypeFilter, e.target.value)}
          className="border border-gray-200 rounded px-3 py-2 text-sm bg-white"
        >
          <option value="">Tüm hedef tipler</option>
          {TARGET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={adminIdFilter}
          onChange={(e) => onFilterChange(setAdminIdFilter, e.target.value)}
          placeholder="Admin ID (UUID)"
          className="border border-gray-200 rounded px-3 py-2 text-sm font-mono w-64"
        />

        {hasFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Filtreleri Temizle
          </button>
        )}

        <button
          type="button"
          onClick={downloadCsv}
          disabled={loading || total === 0}
          className="ml-auto px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          📥 CSV İndir
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-10 bg-gray-100 rounded"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            {hasFilter
              ? "Bu filtreyle eşleşen kayıt yok"
              : "Henüz denetim kaydı yok"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Admin ID</th>
                <th className="px-4 py-3">Aksiyon</th>
                <th className="px-4 py-3">Hedef Tip</th>
                <th className="px-4 py-3">Hedef ID</th>
                <th className="px-4 py-3">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {new Date(log.createdAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {log.adminUserId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{log.targetType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {log.targetId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 font-mono">
                      {truncate(JSON.stringify(log.payload ?? {}), 60)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-500">
          Sayfa {page} / {totalPages} — Toplam {total}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            disabled={offset === 0 || loading}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Önceki
          </button>
          <button
            type="button"
            onClick={() => setOffset(offset + LIMIT)}
            disabled={offset + LIMIT >= total || loading}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
