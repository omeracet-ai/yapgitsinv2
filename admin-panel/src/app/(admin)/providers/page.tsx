"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Provider, type Paginated } from "@/lib/api";
import { Pager } from "@/components/ui/Pager";

const PAGE_LIMIT = 20;

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "",           label: "Tüm ustalar" },
  { value: "verified",   label: "Doğrulanmış" },
  { value: "unverified", label: "Doğrulanmamış" },
];

// Airtasker-style badges (UI tarafı). Manuel olanlar admin tarafından açılıp kapanır;
// computed olanlar backend'den otomatik döner ve burada read-only olarak görünür.
const BADGE_META: Record<string, { label: string; emoji: string; manual: boolean; color: string }> = {
  insurance:         { label: "Sigortalı",          emoji: "🛡️", manual: true,  color: "bg-emerald-100 text-emerald-700" },
  premium:           { label: "Premium",            emoji: "👑", manual: true,  color: "bg-amber-100 text-amber-700" },
  partner:           { label: "Partner",            emoji: "🤝", manual: true,  color: "bg-purple-100 text-purple-700" },
  verified_business: { label: "Doğrulanmış İşletme",emoji: "🏢", manual: true,  color: "bg-blue-100 text-blue-700" },
  blue_tick:         { label: "Mavi Tik",           emoji: "✓",  manual: false, color: "bg-blue-100 text-blue-600" },
  top_rated:         { label: "En Yüksek Puan",     emoji: "⭐", manual: false, color: "bg-yellow-100 text-yellow-700" },
  reliable:          { label: "Güvenilir",          emoji: "✅", manual: false, color: "bg-green-100 text-green-700" },
  rookie:            { label: "Yeni",               emoji: "🌱", manual: false, color: "bg-lime-100 text-lime-700" },
  power_tasker:      { label: "Süper Usta",         emoji: "🚀", manual: false, color: "bg-rose-100 text-rose-700" },
  fast_responder:    { label: "Hızlı Cevap",        emoji: "⚡", manual: false, color: "bg-cyan-100 text-cyan-700" },
};
const MANUAL_BADGE_IDS = Object.entries(BADGE_META).filter(([, m]) => m.manual).map(([id]) => id);

export default function ProvidersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const urlSearch = searchParams.get("search") ?? "";
  const urlStatus = searchParams.get("status") ?? "";

  const [paged, setPaged] = useState<Paginated<Provider>>({
    items: [], total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 1,
  });
  const providers = paged.items;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [featuring, setFeaturing] = useState<string | null>(null);
  const [badgePicker, setBadgePicker] = useState<string | null>(null);
  const [savingBadges, setSavingBadges] = useState<string | null>(null);
  const [editingSkills, setEditingSkills] = useState<string | null>(null);
  const [skillsDraft, setSkillsDraft] = useState<string>("");
  const [savingSkills, setSavingSkills] = useState<string | null>(null);
  const [slotCount, setSlotCount] = useState(3);
  const [searchInput, setSearchInput] = useState(urlSearch);

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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchInput === urlSearch) return;
    debounceRef.current = setTimeout(() => {
      updateUrl({ search: searchInput, page: 1 });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput, urlSearch, updateUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const data = await api.getProviders({
        page: urlPage,
        limit: PAGE_LIMIT,
        search: urlSearch || undefined,
        status: urlStatus || undefined,
      });
      setPaged(data);
      const maxUsed = data.items.reduce((m, p) => Math.max(m, p.featuredOrder ?? 0), 0);
      setSlotCount(prev => Math.max(prev, maxUsed, 3));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [urlPage, urlSearch, urlStatus]);

  useEffect(() => { load(); }, [load]);

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

  const handleToggleBadge = async (p: Provider, badge: string) => {
    if (!p.userId) return;
    const current = (p.badges ?? []).filter((b) => MANUAL_BADGE_IDS.includes(b));
    const next = current.includes(badge)
      ? current.filter((b) => b !== badge)
      : [...current, badge];
    setSavingBadges(p.id);
    // Optimistic: keep computed badges, swap manual ones
    setPaged((prev) => ({
      ...prev,
      items: prev.items.map((x) =>
        x.id === p.id
          ? { ...x, badges: [...next, ...((x.badges ?? []).filter((b) => !MANUAL_BADGE_IDS.includes(b)))] }
          : x,
      ),
    }));
    try {
      await api.setUserBadges(p.userId, next);
      await load();
    } catch (e) {
      setError((e as Error).message);
      await load();
    } finally {
      setSavingBadges(null);
    }
  };

  const handleSaveSkills = async (p: Provider) => {
    if (!p.userId) return;
    const skills = skillsDraft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setSavingSkills(p.id);
    try {
      await api.setUserSkills(p.userId, skills);
      await load();
      setEditingSkills(null);
      setSkillsDraft("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingSkills(null);
    }
  };

  const handleRemoveSkill = async (p: Provider, skill: string) => {
    if (!p.userId) return;
    const next = (p.workerSkills ?? []).filter((s) => s !== skill);
    setSavingSkills(p.id);
    setPaged((prev) => ({
      ...prev,
      items: prev.items.map((x) => (x.id === p.id ? { ...x, workerSkills: next } : x)),
    }));
    try {
      await api.setUserSkills(p.userId, next);
    } catch (e) {
      setError((e as Error).message);
      await load();
    } finally {
      setSavingSkills(null);
    }
  };

  const handleFeatured = async (p: Provider, featuredOrder: number | null) => {
    setFeaturing(p.id);
    // Optimistic update
    setPaged((prev) => ({
      ...prev,
      items: prev.items.map((x) => (x.id === p.id ? { ...x, featuredOrder } : x)),
    }));
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
        <h2 className="text-lg font-semibold">Ustalar & Doğrulama</h2>
        <span className="text-sm text-gray-400">{paged.total} usta</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="İşletme, ad, e-posta veya telefonda ara…"
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">İşletme / Kullanıcı</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Puan</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Belge</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Mavi Tik</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Rozetler</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Yetenekler</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Öne Çıkan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 rounded bg-gray-100" /></td>
                    ))}
                  </tr>
                ))
              )}
              {!loading && providers.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">
                  {urlSearch || urlStatus ? "Sonuç bulunamadı." : "Henüz usta yok."}
                </td></tr>
              )}
              {!loading && providers.map(p => (
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
                  <td className="px-4 py-3">
                    {/* Rozet pill listesi + ekleme dropdown'u */}
                    <div className="flex flex-wrap items-center gap-1 max-w-[280px]">
                      {(p.badges ?? []).map((b) => {
                        const meta = BADGE_META[b];
                        if (!meta) return null;
                        const isManual = meta.manual;
                        return (
                          <span
                            key={b}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
                            title={isManual ? "Manuel rozet — tıkla kaldır" : "Otomatik rozet (istatistiklerden)"}
                          >
                            <span>{meta.emoji}</span>
                            <span>{meta.label}</span>
                            {isManual && (
                              <button
                                onClick={() => handleToggleBadge(p, b)}
                                disabled={savingBadges === p.id}
                                className="ml-0.5 text-current opacity-60 hover:opacity-100 disabled:opacity-30"
                                title="Kaldır"
                              >×</button>
                            )}
                          </span>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setBadgePicker(badgePicker === p.id ? null : p.id)}
                        className="text-xs text-gray-500 hover:text-blue-600 px-1.5 py-0.5 rounded border border-dashed border-gray-300 hover:border-blue-400"
                      >+ Rozet</button>
                      {badgePicker === p.id && (
                        <div className="w-full mt-1 p-2 rounded-lg border border-gray-200 bg-white shadow-sm flex flex-wrap gap-1">
                          {MANUAL_BADGE_IDS.filter((id) => !(p.badges ?? []).includes(id)).map((id) => {
                            const m = BADGE_META[id];
                            return (
                              <button
                                key={id}
                                onClick={() => { handleToggleBadge(p, id); setBadgePicker(null); }}
                                disabled={savingBadges === p.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.color} hover:ring-2 hover:ring-offset-1 hover:ring-current disabled:opacity-50`}
                              >
                                <span>{m.emoji}</span> {m.label}
                              </button>
                            );
                          })}
                          {MANUAL_BADGE_IDS.every((id) => (p.badges ?? []).includes(id)) && (
                            <span className="text-xs text-gray-400">Tüm manuel rozetler atandı</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {/* Yetenekler — chip listesi + edit modu */}
                    <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
                      {(p.workerSkills ?? []).map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs border border-indigo-100"
                        >
                          {s}
                          <button
                            onClick={() => handleRemoveSkill(p, s)}
                            disabled={savingSkills === p.id}
                            className="opacity-50 hover:opacity-100 disabled:opacity-30"
                            title="Kaldır"
                          >×</button>
                        </span>
                      ))}
                      {editingSkills === p.id ? (
                        <div className="flex items-center gap-1 w-full mt-1">
                          <input
                            value={skillsDraft}
                            onChange={(e) => setSkillsDraft(e.target.value)}
                            placeholder="virgülle ayır: Su Kaçağı, Klozet…"
                            className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 focus:border-blue-400 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveSkills(p)}
                            disabled={savingSkills === p.id || !skillsDraft.trim()}
                            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >{savingSkills === p.id ? "…" : "Ekle"}</button>
                          <button
                            onClick={() => { setEditingSkills(null); setSkillsDraft(""); }}
                            className="text-xs text-gray-400 hover:text-gray-600 px-1"
                          >iptal</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingSkills(p.id); setSkillsDraft(""); }}
                          className="text-xs text-gray-500 hover:text-blue-600 px-1.5 py-0.5 rounded border border-dashed border-gray-300 hover:border-blue-400"
                        >+ Yetenek</button>
                      )}
                    </div>
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
        <Pager
          page={paged.page}
          totalPages={paged.totalPages}
          onChange={(p) => updateUrl({ page: p })}
        />
      </div>
    </div>
  );
}
