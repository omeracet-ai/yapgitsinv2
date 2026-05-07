"use client";

import { useEffect, useState } from "react";
import { api, type AuditLog } from "@/lib/api";

const LIMIT = 50;

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .auditLog(LIMIT, offset)
      .then((data) => {
        if (!cancelled) setLogs(data ?? []);
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
  }, [offset]);

  const page = Math.floor(offset / LIMIT) + 1;
  const isLastPage = logs.length < LIMIT;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Denetim Kaydı</h1>
      <p className="text-sm text-gray-500 mb-6">
        Admin tarafından yapılan tüm önemli aksiyonların kaydı
      </p>

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
            Henüz denetim kaydı yok
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
        <span className="text-sm text-gray-500">Sayfa {page}</span>
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
            disabled={isLastPage || loading}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
