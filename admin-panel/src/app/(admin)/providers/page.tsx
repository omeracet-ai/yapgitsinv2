"use client";

import { useEffect, useState } from "react";
import { api, type Provider } from "@/lib/api";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [featuring, setFeaturing] = useState<string | null>(null);
  const [slotCount, setSlotCount] = useState(3);

  const load = async () => {
    try {
      setError(null);
      const data = await api.providers();
      setProviders(data);
      const maxUsed = data.reduce((m, p) => Math.max(m, p.featuredOrder ?? 0), 0);
      setSlotCount(prev => Math.max(prev, maxUsed, 3));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (p: Provider, value: boolean) => {
    setToggling(p.id);
    try {
      await api.setVerification(p.id, value);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setToggling(null);
    }
  };

  const handleFeatured = async (p: Provider, featuredOrder: number | null) => {
    setFeaturing(p.id);
    // Optimistic update
    setProviders(prev =>
      prev.map(x => x.id === p.id ? { ...x, featuredOrder } : x)
    );
    try {
      await api.setProviderFeatured(p.id, featuredOrder);
    } catch (e) {
      setError((e as Error).message);
      await load(); // revert
    } finally {
      setFeaturing(null);
    }
  };

  // Featured slot summary
  const featuredSlots: Record<number, Provider | undefined> = {};
  providers.forEach(p => { if (p.featuredOrder) featuredSlots[p.featuredOrder] = p; });
  const slots = Array.from({ length: slotCount }, (_, i) => i + 1);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Sağlayıcılar & Doğrulama</h2>
        <span className="text-sm text-gray-400">{providers.length} sağlayıcı</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* Öne Çıkan Slot Yönetimi */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">Öne Çıkan Slot Sayısı:</span>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setSlotCount(n => Math.max(1, n - 1))}
            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 font-bold text-sm transition-colors"
          >−</button>
          <span className="px-4 py-1.5 text-sm font-semibold text-gray-800 bg-white border-x border-gray-200 min-w-[40px] text-center">{slotCount}</span>
          <button
            onClick={() => setSlotCount(n => n + 1)}
            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 font-bold text-sm transition-colors"
          >+</button>
        </div>
        <span className="text-xs text-gray-400">Uygulamada öne çıkan usta sayısını belirler</span>
      </div>

      {/* Öne Çıkan Sıra Özeti */}
      <div className="mb-6 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(slotCount, 6)}, minmax(0, 1fr))` }}>
        {slots.map(slot => {
          const p = featuredSlots[slot];
          return (
            <div
              key={slot}
              className={`rounded-xl border-2 px-4 py-3 ${p ? "border-amber-300 bg-amber-50" : "border-dashed border-gray-200 bg-gray-50"}`}
            >
              <p className="text-xs font-semibold text-amber-600 mb-1">⭐ {slot}. Sıra</p>
              {p ? (
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.businessName}</p>
                    <p className="text-xs text-gray-500">★ {p.averageRating.toFixed(1)}</p>
                  </div>
                  <button
                    onClick={() => handleFeatured(p, null)}
                    className="text-xs text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                    title="Kaldır"
                  >✕</button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Boş</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 text-sm">
        <strong>Mavi Tik & Öne Çıkan:</strong> &quot;Mavi Tik&quot; sütunuyla doğrulama yapın.
        &quot;Öne Çıkan&quot; sütunundan usta için sıra seçin — uygulama ön sıraya alır. Slot sayısını yukarıdan ayarlayın.
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Yükleniyor…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">İşletme / Kullanıcı</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Puan</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Belge</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Mavi Tik</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Öne Çıkan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {providers.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Henüz sağlayıcı yok.</td></tr>
              )}
              {providers.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.featuredOrder ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">
                      {p.businessName}
                      {p.isVerified && <span className="ml-1 text-blue-500" title="Doğrulanmış">✓</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">
                      {p.user?.fullName ?? p.userId}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-yellow-500">★</span> {p.averageRating.toFixed(1)}
                    <span className="text-gray-400 text-xs ml-1">({p.totalReviews})</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.hasCertificate ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Var ✓</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">Yok</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-blue-600 font-semibold text-xs">
                        <span className="text-base">✓</span> Doğrulandı
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">— Doğrulanmadı</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={p.featuredOrder ?? ""}
                      disabled={featuring === p.id}
                      onChange={e => handleFeatured(p, e.target.value === "" ? null : Number(e.target.value))}
                      className={`text-xs rounded-lg border px-2 py-1 cursor-pointer
                        ${p.featuredOrder
                          ? "border-amber-300 bg-amber-50 text-amber-700 font-semibold"
                          : "border-gray-200 bg-white text-gray-500"
                        } disabled:opacity-50`}
                    >
                      <option value="">— Normal —</option>
                      {slots.map(s => (
                        <option key={s} value={s}>⭐ {s}. Sıra</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 text-xs font-medium">
                      <button
                        onClick={() => handleVerify(p, true)}
                        disabled={toggling === p.id || p.isVerified}
                        className={`px-3 py-1.5 transition-colors ${p.isVerified ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-gray-600"} disabled:cursor-not-allowed`}
                      >
                        {toggling === p.id ? "…" : "Onayla"}
                      </button>
                      <button
                        onClick={() => handleVerify(p, false)}
                        disabled={toggling === p.id || !p.isVerified}
                        className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${!p.isVerified ? "bg-red-100 text-red-600" : "hover:bg-red-50 text-gray-600"} disabled:cursor-not-allowed`}
                      >
                        Kaldır
                      </button>
                    </div>
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
