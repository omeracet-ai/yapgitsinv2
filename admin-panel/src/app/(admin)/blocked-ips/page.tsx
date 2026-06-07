"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type BlockedIp } from "@/lib/api";

export default function BlockedIpsPage() {
  const [rows, setRows] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("24");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listBlockedIps(500);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) return;
    setSubmitting(true);
    try {
      await api.blockIp({
        ip: ip.trim(),
        reason: reason.trim() || undefined,
        durationHours: duration === "perm" ? null : Number(duration) || 24,
      });
      setIp("");
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ekleme başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  const unblock = async (id: string, ip: string) => {
    if (!confirm(`${ip} engelini kaldır?`)) return;
    try {
      await api.unblockIp(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "kaldırma başarısız");
    }
  };

  const expiryLabel = (iso: string | null): string => {
    if (!iso) return "Kalıcı";
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "Süresi dolmuş";
    const h = Math.floor(ms / 3_600_000);
    if (h < 24) return `${h}h kaldı`;
    return `${Math.floor(h / 24)}g kaldı`;
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🛡️ Engellenen IP&apos;ler</h2>
        <p className="text-sm text-gray-500 mt-1">
          Bot Protection middleware bu IP&apos;leri 403 ile reddeder. UA blacklist (ahrefs, semrush, gptbot, scrapy vs.) ayrıca otomatik.
        </p>
      </div>

      {/* Add form */}
      <form
        onSubmit={submit}
        className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3"
      >
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">IP</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="1.2.3.4"
            className="w-full px-3 py-2 border rounded-lg text-sm"
            required
          />
        </div>
        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Sebep</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="örn. brute force, spam, scraper"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Süre</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="1">1 saat</option>
            <option value="24">24 saat</option>
            <option value="168">1 hafta</option>
            <option value="720">30 gün</option>
            <option value="perm">Kalıcı</option>
          </select>
        </div>
        <div className="md:col-span-2 flex items-end">
          <button
            type="submit"
            disabled={submitting || !ip.trim()}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-red-700"
          >
            {submitting ? "..." : "🚫 Engelle"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">IP</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Sebep</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Süre</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Hit</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">UA</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Engelleyen</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Yükleniyor…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Henüz engellenen IP yok.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-900">{r.ip}</td>
                  <td className="px-4 py-3 text-gray-700">{r.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${r.expiresAt ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                    >
                      {expiryLabel(r.expiresAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{r.hitCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={r.lastUserAgent}>
                    {r.lastUserAgent || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.blockedBy === "system" ? "🤖 sistem" : `👤 ${r.blockedBy.slice(0, 8)}…`}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => unblock(r.id, r.ip)}
                      className="text-xs px-3 py-1 rounded bg-emerald-100 text-emerald-700 font-semibold hover:bg-emerald-200"
                    >
                      ✓ Kaldır
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
