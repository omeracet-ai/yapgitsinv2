"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ModerationQueueItem } from "@/lib/api";

type ModType = "job" | "review" | "chat";
type ModAction = "approve" | "remove" | "ban_user";

const TABS: { value: ModType; label: string }[] = [
  { value: "job", label: "İlanlar" },
  { value: "review", label: "Yorumlar" },
  { value: "chat", label: "Sohbet" },
];

const ACTION_LABELS: Record<ModAction, string> = {
  approve: "✅ Onayla",
  remove: "❌ Kaldır",
  ban_user: "🚫 Askıya Al",
};

const ACTION_CONFIRM: Record<ModAction, string> = {
  approve: "Bu içeriği onaylamak istediğine emin misin?",
  remove: "Bu içeriği kaldırmak istediğine emin misin?",
  ban_user: "Kullanıcıyı askıya almak istediğine emin misin?",
};

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleString("tr-TR"); } catch { return s; }
}

function truncate(t: string, n = 100): string {
  if (!t) return "—";
  return t.length <= n ? t : t.slice(0, n) + "…";
}

function fraudBadge(score: number | null) {
  if (score === null || score === undefined) {
    return <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700">—</span>;
  }
  let cls = "bg-emerald-100 text-emerald-800";
  let label = "Düşük";
  if (score >= 70) { cls = "bg-red-100 text-red-800"; label = "Yüksek"; }
  else if (score >= 40) { cls = "bg-amber-100 text-amber-800"; label = "Orta"; }
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${cls}`}>
      {label} ({score})
    </span>
  );
}

export default function ModerationPage() {
  const [type, setType] = useState<ModType>("job");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.getModerationQueue({ type, page, limit });
      setItems(res.data);
      setTotal(res.total);
      setPages(res.pages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme hatası");
    } finally {
      setLoading(false);
    }
  }, [type, page, limit]);

  useEffect(() => { void load(); }, [load]);

  const switchType = (t: ModType) => {
    if (t === type) return;
    setType(t);
    setPage(1);
  };

  const handleAction = async (item: ModerationQueueItem, action: ModAction) => {
    if (!confirm(ACTION_CONFIRM[action])) return;
    try {
      setBusyId(item.id);
      await api.moderateItem(type, item.id, action);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      alert(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">🛡️ Moderasyon Kuyruğu</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            AI fraud-detection tarafından işaretlenmiş içerikler — onayla, kaldır veya kullanıcıyı askıya al.
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
        >
          ↻ Yenile
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const active = t.value === type;
          return (
            <button
              key={t.value}
              onClick={() => switchType(t.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && <div className="text-sm text-slate-500 py-12 text-center">Yükleniyor…</div>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500 text-sm">
          Bu kuyrukta kayıt yok 👍
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Tarih</th>
                  <th className="px-4 py-2 text-left font-medium">Kullanıcı</th>
                  <th className="px-4 py-2 text-left font-medium">İçerik</th>
                  <th className="px-4 py-2 text-left font-medium">Sebep</th>
                  <th className="px-4 py-2 text-left font-medium">Skor</th>
                  <th className="px-4 py-2 text-right font-medium">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={`${it.type}-${it.id}`} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(it.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{it.userName ?? (it.userId ? it.userId.slice(0, 8) : "—")}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-md">{truncate(it.content)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800">
                        {it.flagReason ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{fraudBadge(it.fraudScore)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {(["approve", "remove", "ban_user"] as ModAction[]).map((a) => (
                          <button
                            key={a}
                            disabled={busyId === it.id}
                            onClick={() => void handleAction(it, a)}
                            className={`px-2 py-1 text-xs font-medium rounded-md disabled:opacity-50 ${
                              a === "approve"
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                                : a === "remove"
                                ? "bg-red-50 hover:bg-red-100 text-red-700"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {ACTION_LABELS[a]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Toplam <span className="font-semibold text-slate-700">{total}</span> kayıt · Sayfa {page}/{pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
              >
                ← Önceki
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
              >
                Sonraki →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
