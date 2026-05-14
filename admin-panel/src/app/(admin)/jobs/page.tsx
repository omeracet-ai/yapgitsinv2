"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Job, type Paginated } from "@/lib/api";
import { Pager } from "@/components/ui/Pager";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open:                { label: "Açık",            cls: "bg-green-100 text-green-700" },
  in_progress:         { label: "Devam Ediyor",    cls: "bg-yellow-100 text-yellow-700" },
  pending_completion:  { label: "Onay Bekliyor",   cls: "bg-orange-100 text-orange-700" },
  completed:           { label: "Tamamlandı",      cls: "bg-blue-100 text-blue-700" },
  cancelled:           { label: "İptal",           cls: "bg-red-100 text-red-600" },
  disputed:            { label: "İhtilaflı",       cls: "bg-rose-100 text-rose-700" },
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "",            label: "Tüm durumlar" },
  { value: "open",        label: "Açık" },
  { value: "in_progress", label: "Devam Ediyor" },
  { value: "completed",   label: "Tamamlandı" },
  { value: "cancelled",   label: "İptal" },
];

const DEFAULT_LIMIT = 20;

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const urlPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const urlSearch = searchParams.get("search") ?? "";
  const urlStatus = searchParams.get("status") ?? "";

  const [data, setData] = useState<Paginated<Job>>({
    items: [], total: 0, page: 1, limit: DEFAULT_LIMIT, totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(urlSearch);

  // Sync URL → state when URL changes (back/forward)
  useEffect(() => { setSearchInput(urlSearch); }, [urlSearch]);

  const updateUrl = useCallback((next: { page?: number; search?: string; status?: string }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next.page !== undefined) {
      if (next.page <= 1) sp.delete("page"); else sp.set("page", String(next.page));
    }
    if (next.search !== undefined) {
      if (!next.search) sp.delete("search"); else sp.set("search", next.search);
    }
    if (next.status !== undefined) {
      if (!next.status) sp.delete("status"); else sp.set("status", next.status);
    }
    router.replace(`?${sp.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Debounce search input → URL
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchInput === urlSearch) return;
    debounceRef.current = setTimeout(() => {
      updateUrl({ search: searchInput, page: 1 });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput, urlSearch, updateUrl]);

  // Fetch on URL change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getJobs({
      page: urlPage,
      limit: DEFAULT_LIMIT,
      search: urlSearch || undefined,
      status: urlStatus || undefined,
    })
      .then((res) => { if (!cancelled) { setData(res); setError(null); } })
      .catch((e) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [urlPage, urlSearch, urlStatus]);

  async function handleFeaturedChange(jobId: string, value: string) {
    const order = value === "" ? null : Number(value);
    setSaving(jobId);
    try {
      await api.setFeaturedOrder(jobId, order);
      setData(prev => ({
        ...prev,
        items: prev.items.map(j => j.id === jobId ? { ...j, featuredOrder: order } : j),
      }));
    } catch (e) {
      alert("Hata: " + (e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  const featuredSlots = useMemo(() => [1, 2, 3], []);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">İlan Yönetimi</h2>
        <span className="text-sm text-gray-400">{data.total} ilan</span>
      </div>

      {/* Öne Çıkan Özet — sayfa içeriğinden bağımsız, mevcut sayfa baz alınır */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {featuredSlots.map(slot => {
          const featured = data.items.find(j => j.featuredOrder === slot);
          return (
            <div key={slot} className={`rounded-xl border p-4 ${featured ? "border-amber-400 bg-amber-50" : "border-dashed border-gray-300 bg-gray-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500">★</span>
                <span className="text-xs font-semibold text-gray-500">#{slot}. Öne Çıkan Slot</span>
              </div>
              {featured ? (
                <p className="text-sm font-medium text-gray-800 truncate">{featured.title}</p>
              ) : (
                <p className="text-xs text-gray-400">Bu sayfada slot {slot} boş</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Search + status filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Başlık, kategori veya konumda ara…"
          className="flex-1 min-w-[240px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={urlStatus}
          onChange={(e) => updateUrl({ status: e.target.value, page: 1 })}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

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
            {loading && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="animate-pulse">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 rounded bg-gray-100" /></td>
                  ))}
                </tr>
              ))
            )}
            {!loading && data.items.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                {urlSearch || urlStatus ? "Sonuç bulunamadı." : "Henüz ilan bulunmuyor."}
              </td></tr>
            )}
            {!loading && data.items.map(j => {
              const s = STATUS_MAP[j.status] ?? { label: j.status, cls: "bg-gray-100 text-gray-600" };
              const isSaving = saving === j.id;
              return (
                <tr key={j.id} className={`transition-colors ${j.featuredOrder ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"}`}>
                  <td className="px-4 py-3 font-medium max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      {j.featuredOrder && (
                        <span className="text-amber-400 text-xs font-bold">#{j.featuredOrder}</span>
                      )}
                      <span className="truncate">{j.title}</span>
                    </div>
                    {j.photos && j.photos.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {j.photos.slice(0, 5).map((url, idx) => (
                          <img
                            key={idx}
                            src={url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL ?? ''}${url}`}
                            alt={`Fotoğraf ${idx + 1}`}
                            className="w-8 h-8 rounded object-cover border border-gray-200"
                          />
                        ))}
                      </div>
                    )}
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
        <Pager
          page={data.page}
          totalPages={data.totalPages}
          onChange={(p) => updateUrl({ page: p })}
        />
      </div>
    </div>
  );
}
