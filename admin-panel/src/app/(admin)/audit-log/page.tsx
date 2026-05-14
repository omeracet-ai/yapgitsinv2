"use client";

import { useEffect, useState } from "react";
import { api, type AuditLog, type AuditLogStats } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

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
  const toast = useToast();
  const confirm = useConfirm();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [adminIdFilter, setAdminIdFilter] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [statsDays, setStatsDays] = useState(30);
  const [statsLoading, setStatsLoading] = useState(true);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeDays, setPurgeDays] = useState(90);
  const [purgePreview, setPurgePreview] = useState<{ wouldDelete: number; cutoffDate: string } | null>(null);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [refetchTick, setRefetchTick] = useState(0);

  function openPurgeModal() {
    setPurgeOpen(true);
    setPurgeDays(90);
    setPurgePreview(null);
    setPurgeError(null);
  }

  async function handlePreview() {
    setPurgeLoading(true);
    setPurgeError(null);
    setPurgePreview(null);
    try {
      const res = await api.previewAuditLogPurge(purgeDays);
      setPurgePreview({ wouldDelete: res.wouldDelete, cutoffDate: res.cutoffDate });
    } catch (e) {
      setPurgeError(e instanceof Error ? e.message : String(e));
    } finally {
      setPurgeLoading(false);
    }
  }

  async function handlePurge() {
    if (!purgePreview) return;
    const ok = await confirm({
      title: "Kayıtları Sil",
      message: `${purgePreview.wouldDelete} kayıt KALICI silinecek, emin misin?`,
      confirmLabel: "Sil",
      cancelLabel: "İptal",
      variant: "danger",
    });
    if (!ok) return;
    setPurgeLoading(true);
    setPurgeError(null);
    try {
      const res = await api.purgeAuditLog(purgeDays);
      toast.success(`${res.deleted} kayıt silindi`);
      setPurgeOpen(false);
      setRefetchTick((t) => t + 1);
    } catch (e) {
      setPurgeError(e instanceof Error ? e.message : String(e));
    } finally {
      setPurgeLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    api
      .auditLogStats(statsDays)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statsDays, refetchTick]);

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
  }, [offset, actionFilter, targetTypeFilter, adminIdFilter, refetchTick]);

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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">İstatistikler</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openPurgeModal}
              className="px-3 py-1 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              🗑️ Eski Kayıtları Temizle
            </button>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setStatsDays(d)}
                className={`px-3 py-1 text-xs rounded-lg border ${
                  statsDays === d
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Son {d} gün
              </button>
            ))}
          </div>
          </div>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-20 bg-gray-100 rounded-lg"
              />
            ))}
          </div>
        ) : !stats ? (
          <div className="text-sm text-gray-500">İstatistik yüklenemedi</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Toplam Giriş
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalEntries}
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  En Sık Aksiyon
                </div>
                <div className="text-sm font-mono font-semibold text-blue-700 truncate">
                  {stats.topActions[0]?.action ?? "—"}
                </div>
                <div className="text-xs text-gray-500">
                  {stats.topActions[0]?.count ?? 0} kayıt
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  En Aktif Admin
                </div>
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {stats.topAdmins[0]?.adminName ?? "—"}
                </div>
                <div className="text-xs text-gray-500">
                  {stats.topAdmins[0]?.count ?? 0} aksiyon
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  En Çok Hedef
                </div>
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {stats.topTargetTypes[0]?.targetType ?? "—"}
                </div>
                <div className="text-xs text-gray-500">
                  {stats.topTargetTypes[0]?.count ?? 0} kayıt
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Top 5 Aksiyon
                </div>
                <ul className="space-y-1">
                  {stats.topActions.slice(0, 5).map((a) => (
                    <li
                      key={a.action}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono text-xs text-gray-700 truncate">
                        {a.action}
                      </span>
                      <span className="ml-2 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                        {a.count}
                      </span>
                    </li>
                  ))}
                  {stats.topActions.length === 0 && (
                    <li className="text-xs text-gray-400">Veri yok</li>
                  )}
                </ul>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Top 5 Admin
                </div>
                <ul className="space-y-1">
                  {stats.topAdmins.slice(0, 5).map((a) => (
                    <li
                      key={a.adminUserId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700 truncate">
                        {a.adminName}
                      </span>
                      <span className="ml-2 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-semibold">
                        {a.count}
                      </span>
                    </li>
                  ))}
                  {stats.topAdmins.length === 0 && (
                    <li className="text-xs text-gray-400">Veri yok</li>
                  )}
                </ul>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Günlük Aktivite
                </div>
                {stats.entriesPerDay.length === 0 ? (
                  <div className="text-xs text-gray-400">Veri yok</div>
                ) : (
                  (() => {
                    const max = Math.max(
                      1,
                      ...stats.entriesPerDay.map((d) => d.count),
                    );
                    return (
                      <div className="flex items-end gap-0.5 h-20">
                        {stats.entriesPerDay.map((d) => (
                          <div
                            key={d.date}
                            title={`${d.date}: ${d.count}`}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-t min-w-[2px]"
                            style={{
                              height: `${Math.max(2, (d.count / max) * 100)}%`,
                            }}
                          />
                        ))}
                      </div>
                    );
                  })()
                )}
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>{stats.entriesPerDay[0]?.date ?? ""}</span>
                  <span>
                    {stats.entriesPerDay[stats.entriesPerDay.length - 1]
                      ?.date ?? ""}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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

      {purgeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !purgeLoading && setPurgeOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Eski Kayıtları Temizle</h3>
            <p className="text-sm text-gray-500 mb-4">
              Belirtilen günden eski denetim kayıtlarını kalıcı olarak siler.
            </p>

            <label className="block text-xs font-medium text-gray-700 mb-1">
              Şundan eski (gün)
            </label>
            <input
              type="number"
              min={30}
              max={365}
              value={purgeDays}
              onChange={(e) => {
                setPurgeDays(Number(e.target.value));
                setPurgePreview(null);
              }}
              disabled={purgeLoading}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3"
            />
            <p className="text-xs text-gray-500 mb-4">30 - 365 gün arası</p>

            {purgePreview && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4 text-sm">
                <div>
                  <span className="font-semibold text-amber-900">
                    {purgePreview.wouldDelete}
                  </span>{" "}
                  kayıt silinecek
                </div>
                <div className="text-xs text-amber-700 mt-1">
                  Kesim tarihi: {new Date(purgePreview.cutoffDate).toLocaleString("tr-TR")}
                </div>
              </div>
            )}

            {purgeError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-4 text-sm text-red-700">
                {purgeError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPurgeOpen(false)}
                disabled={purgeLoading}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={purgeLoading || purgeDays < 30 || purgeDays > 365}
                className="px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40"
              >
                {purgeLoading && !purgePreview ? "Yükleniyor..." : "Önizle"}
              </button>
              <button
                type="button"
                onClick={handlePurge}
                disabled={purgeLoading || !purgePreview || purgePreview.wouldDelete === 0}
                className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {purgeLoading && purgePreview ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
