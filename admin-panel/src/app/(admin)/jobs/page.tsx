"use client";

import { useEffect, useState } from "react";
import { api, type Job } from "@/lib/api";

const STATUS_MAP: Record<Job["status"], { label: string; cls: string }> = {
  open:        { label: "Açık",         cls: "bg-green-100 text-green-700" },
  in_progress: { label: "Devam Ediyor", cls: "bg-yellow-100 text-yellow-700" },
  completed:   { label: "Tamamlandı",   cls: "bg-blue-100 text-blue-700" },
  cancelled:   { label: "İptal",        cls: "bg-red-100 text-red-600" },
};

export default function JobsPage() {
  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState<string | null>(null); // jobId being saved

  useEffect(() => {
    api.recentJobs(50)
      .then(setJobs)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function handleFeaturedChange(jobId: string, value: string) {
    const order = value === "" ? null : Number(value);
    setSaving(jobId);
    try {
      await api.setFeaturedOrder(jobId, order);
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, featuredOrder: order } : j
      ));
    } catch (e) {
      alert("Hata: " + (e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  const featuredSlots = [1, 2, 3];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">İlan Yönetimi</h2>
        <span className="text-sm text-gray-400">{jobs.length} ilan</span>
      </div>

      {/* Öne Çıkan Özet */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {featuredSlots.map(slot => {
          const featured = jobs.find(j => j.featuredOrder === slot);
          return (
            <div key={slot} className={`rounded-xl border p-4 ${featured ? "border-amber-400 bg-amber-50" : "border-dashed border-gray-300 bg-gray-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500">★</span>
                <span className="text-xs font-semibold text-gray-500">#{slot}. Öne Çıkan Slot</span>
              </div>
              {featured ? (
                <p className="text-sm font-medium text-gray-800 truncate">{featured.title}</p>
              ) : (
                <p className="text-xs text-gray-400">Boş — aşağıdan ilan atayın</p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm animate-pulse">Yükleniyor…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Başlık</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Konum</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Bütçe (₺)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Durum</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 w-36">Öne Çıkar</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Henüz ilan bulunmuyor.</td></tr>
              )}
              {jobs.map(j => {
                const s = STATUS_MAP[j.status];
                const isSaving = saving === j.id;
                return (
                  <tr key={j.id} className={`transition-colors ${j.featuredOrder ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3 font-medium max-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        {j.featuredOrder && (
                          <span className="text-amber-400 text-xs font-bold">#{j.featuredOrder}</span>
                        )}
                        <span className="truncate">{j.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{j.category}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{j.location}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {Number(j.budgetMin).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={j.featuredOrder ?? ""}
                        onChange={e => handleFeaturedChange(j.id, e.target.value)}
                        disabled={isSaving}
                        className={`text-xs border rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300
                          ${j.featuredOrder ? "border-amber-400 bg-amber-50 text-amber-700 font-semibold" : "border-gray-200 bg-white text-gray-500"}
                          ${isSaving ? "opacity-50" : ""}`}
                      >
                        <option value="">— Normal —</option>
                        <option value="1">⭐ 1. Sıra</option>
                        <option value="2">⭐ 2. Sıra</option>
                        <option value="3">⭐ 3. Sıra</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(j.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
