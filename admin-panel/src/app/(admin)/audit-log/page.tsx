"use client";

import { useEffect, useState } from "react";
import { api, type AuditLog } from "@/lib/api";

const LIMIT = 50;

const ACTIONS = [
  "job.featured",
  "user.verify",
  "user.badges",
  "user.skills",
  "service_request.featured",
  "provider.featured",
  "provider.verify",
  "category.update",
  "promo.create",
  "promo.update",
  "promo.delete",
  "moderation.chat.delete",
  "moderation.question.delete",
  "report.update",
];

const TARGET_TYPES = [
  "job",
  "user",
  "service_request",
  "provider",
  "category",
  "promo_code",
  "chat_message",
  "job_question",
  "report",
];

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </div>
      <div className={`text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
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
  const [selected, setSelected] = useState<AuditLog | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    if (selected) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [selected]);

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
                <tr
                  key={log.id}
                  onClick={() => setSelected(log)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
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

      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Denetim Kaydı Detayı</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                aria-label="Kapat"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-4">
              <Field label="ID" value={selected.id} mono />
              <Field
                label="Tarih"
                value={new Date(selected.createdAt).toLocaleString("tr-TR")}
              />
              <Field label="Admin ID" value={selected.adminUserId} mono />
              <Field label="Aksiyon" value={selected.action} mono />
              <Field
                label="Hedef Tip"
                value={selected.targetType || "—"}
              />
              <Field
                label="Hedef ID"
                value={selected.targetId || "—"}
                mono
              />
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                  Payload
                </div>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  {JSON.stringify(selected.payload ?? {}, null, 2)}
                </pre>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

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
