"use client";

import { useEffect, useState } from "react";
import { api, type UserReport } from "@/lib/api";

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  harassment: "Taciz",
  fraud: "Dolandırıcılık",
  inappropriate: "Uygunsuz",
  other: "Diğer",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  reviewed: "İncelendi",
  dismissed: "Reddedildi",
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Bekleyen" },
  { value: "reviewed", label: "İncelenen" },
  { value: "dismissed", label: "Reddedilen" },
  { value: "all", label: "Tümü" },
];

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleString("tr-TR");
  } catch {
    return s;
  }
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function statusColor(status: string): string {
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "reviewed") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-200 text-slate-700";
}

export default function ReportsPage() {
  const [items, setItems] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await api.reports(statusFilter);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme hatası");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const update = async (item: UserReport, status: "reviewed" | "dismissed") => {
    setBusyId(item.id);
    try {
      await api.updateReport(item.id, { status });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Güncelleme hatası");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">🚩 Şikayetler</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kullanıcıların açtığı şikayetleri incele.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-sm text-slate-500 py-6 text-center">Yükleniyor…</div>
      )}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="text-sm text-slate-500 py-12 text-center bg-white border border-slate-200 rounded-lg">
          Bu durumda şikayet yok.
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Tarih</th>
                <th className="text-left px-3 py-2 font-medium">Raporlayan</th>
                <th className="text-left px-3 py-2 font-medium">Raporlanan</th>
                <th className="text-left px-3 py-2 font-medium">Sebep</th>
                <th className="text-left px-3 py-2 font-medium">Açıklama</th>
                <th className="text-left px-3 py-2 font-medium">Durum</th>
                <th className="text-right px-3 py-2 font-medium">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                    {fmtDate(it.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-slate-700">
                    {shortId(it.reporterUserId)}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-slate-700">
                    {shortId(it.reportedUserId)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                      {REASON_LABEL[it.reason] ?? it.reason}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 max-w-xs truncate">
                    {it.description ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusColor(it.status)}`}
                    >
                      {STATUS_LABEL[it.status] ?? it.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {it.status === "pending" ? (
                      <div className="flex gap-1 justify-end">
                        <button
                          disabled={busyId === it.id}
                          onClick={() => update(it, "reviewed")}
                          className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          İncelendi
                        </button>
                        <button
                          disabled={busyId === it.id}
                          onClick={() => update(it, "dismissed")}
                          className="px-2 py-1 text-xs rounded bg-slate-500 text-white hover:bg-slate-600 disabled:opacity-50"
                        >
                          Reddet
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
