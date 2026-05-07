"use client";

import { useEffect, useState } from "react";
import { api, type FlaggedItem } from "@/lib/api";

function reasonColor(reason: string | null): string {
  if (!reason) return "bg-slate-200 text-slate-700";
  if (reason.includes("contact")) return "bg-amber-100 text-amber-800";
  if (reason.includes("profanity")) return "bg-red-100 text-red-800";
  return "bg-slate-200 text-slate-700";
}

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleString("tr-TR");
  } catch {
    return s;
  }
}

function truncate(t: string, n = 80): string {
  if (t.length <= n) return t;
  return t.slice(0, n) + "…";
}

export default function ModerationPage() {
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await api.flaggedItems();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme hatası");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleClear = async (item: FlaggedItem) => {
    if (!confirm("Bu kaydı temizlemek istediğinden emin misin?")) return;
    try {
      setBusyId(item.id);
      if (item.type === "chat") {
        await api.deleteFlaggedChat(item.id);
      } else {
        await api.deleteFlaggedQuestion(item.id);
      }
      setItems((prev) => prev.filter((i) => !(i.id === item.id && i.type === item.type)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Silinemedi");
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
            Otomatik filtre tarafından işaretlenmiş chat mesajları ve soru-cevap kayıtları.
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
        >
          ↻ Yenile
        </button>
      </div>

      {loading && (
        <div className="text-sm text-slate-500 py-12 text-center">Yükleniyor…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-500 text-sm">
          Şu an moderasyon kuyruğunda kayıt yok 👍
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Tarih</th>
                <th className="px-4 py-2 text-left font-medium">Tür</th>
                <th className="px-4 py-2 text-left font-medium">Kullanıcı</th>
                <th className="px-4 py-2 text-left font-medium">İçerik</th>
                <th className="px-4 py-2 text-left font-medium">Sebep</th>
                <th className="px-4 py-2 text-right font-medium">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={`${it.type}-${it.id}`}
                  className="border-t border-slate-100 hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {fmtDate(it.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        it.type === "chat"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {it.type === "chat" ? "Chat" : "Soru"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">
                    {it.userId ? it.userId.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-md">
                    {truncate(it.text || "")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${reasonColor(
                        it.flagReason,
                      )}`}
                    >
                      {it.flagReason ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={busyId === it.id}
                      onClick={() => void handleClear(it)}
                      className="px-3 py-1 text-xs font-medium rounded-md bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                    >
                      {busyId === it.id ? "…" : "Sil/Temizle"}
                    </button>
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
