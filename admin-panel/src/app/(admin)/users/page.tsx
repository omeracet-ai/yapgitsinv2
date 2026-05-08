"use client";

import { useEffect, useState } from "react";
import { api, type User } from "@/lib/api";

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  admin:    { label: "Admin",    cls: "bg-red-100 text-red-700" },
  worker:   { label: "İşçi",    cls: "bg-purple-100 text-purple-700" },
  customer: { label: "Müşteri", cls: "bg-blue-100 text-blue-700" },
};

// Phase 137 — admin grant/revoke pool
const MANUAL_BADGES: { key: string; label: string; emoji: string }[] = [
  { key: "top_partner",      label: "Top Partner",        emoji: "🥇" },
  { key: "platform_pioneer", label: "Platform Öncüsü",    emoji: "🚀" },
  { key: "community_hero",   label: "Topluluk Kahramanı", emoji: "❤️" },
  { key: "vip",              label: "VIP",                emoji: "💎" },
];

export default function UsersPage() {
  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy,     setBusy]     = useState(false);
  const [toast,    setToast]    = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [suspendReason,  setSuspendReason]  = useState("");
  const [suspendBusy,    setSuspendBusy]    = useState(false);
  const [badgeTarget,  setBadgeTarget]  = useState<User | null>(null);
  const [badgeChecked, setBadgeChecked] = useState<Set<string>>(new Set());
  const [badgeBusy,    setBadgeBusy]    = useState(false);

  function openBadgeModal(u: User) {
    setBadgeTarget(u);
    setBadgeChecked(new Set(u.manualBadges ?? []));
  }

  async function saveBadges() {
    if (!badgeTarget) return;
    const before = new Set(badgeTarget.manualBadges ?? []);
    const after = badgeChecked;
    const toGrant = MANUAL_BADGES.filter(b => after.has(b.key) && !before.has(b.key));
    const toRevoke = MANUAL_BADGES.filter(b => !after.has(b.key) && before.has(b.key));
    if (toGrant.length === 0 && toRevoke.length === 0) {
      setBadgeTarget(null);
      return;
    }
    setBadgeBusy(true);
    try {
      for (const b of toGrant) await api.grantBadge(badgeTarget.id, b.key);
      for (const b of toRevoke) await api.revokeBadge(badgeTarget.id, b.key);
      showToast(`${badgeTarget.fullName} rozetleri güncellendi`);
      setBadgeTarget(null);
      load();
    } catch (e) {
      window.alert(`Hata: ${(e as Error).message}`);
    } finally {
      setBadgeBusy(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function doSuspend() {
    if (!suspendTarget) return;
    const r = suspendReason.trim();
    if (!r) { window.alert("Sebep zorunlu"); return; }
    if (r.length > 500) { window.alert("Sebep 500 karakteri aşamaz"); return; }
    setSuspendBusy(true);
    try {
      await api.suspendUser(suspendTarget.id, true, r);
      showToast(`${suspendTarget.fullName} askıya alındı`);
      setSuspendTarget(null);
      setSuspendReason("");
      load();
    } catch (e) {
      window.alert(`Hata: ${(e as Error).message}`);
    } finally {
      setSuspendBusy(false);
    }
  }

  async function doUnsuspend(u: User) {
    if (!window.confirm(`${u.fullName} kullanıcısının askısı kaldırılsın mı?`)) return;
    try {
      await api.suspendUser(u.id, false);
      showToast(`${u.fullName} askıdan çıkarıldı`);
      load();
    } catch (e) {
      window.alert(`Hata: ${(e as Error).message}`);
    }
  }

  function load() {
    setLoading(true);
    api.users()
      .then(u => { setUsers(u); setSelected(new Set()); })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const allSelected = users.length > 0 && selected.size === users.length;

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(users.map(u => u.id)));
  }

  async function bulkVerify(identityVerified: boolean) {
    if (selected.size === 0 || busy) return;
    const ids = Array.from(selected);
    const verb = identityVerified ? "doğrulanacak" : "doğrulaması kaldırılacak";
    if (!window.confirm(`${ids.length} kullanıcı ${verb}. Devam edilsin mi?`)) return;
    setBusy(true);
    try {
      const res = await api.bulkVerifyUsers(ids, identityVerified);
      window.alert(`${res.updated} güncellendi, ${res.notFound.length} bulunamadı`);
      load();
    } catch (e) {
      window.alert(`Hata: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const [featureMenu, setFeatureMenu] = useState(false);

  async function bulkFeature(slot: 1 | 2 | 3) {
    if (selected.size === 0 || busy) return;
    const ids = Array.from(selected);
    if (!window.confirm(`${ids.length} işçi slot ${slot}'e featured atanacak. Devam?`)) return;
    setFeatureMenu(false);
    setBusy(true);
    try {
      const res = await api.bulkFeatureUsers(ids, slot);
      window.alert(`${res.updated} güncellendi, ${res.notFound.length} bulunamadı`);
      load();
    } catch (e) {
      window.alert(`Hata: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function bulkUnfeature() {
    if (selected.size === 0 || busy) return;
    const ids = Array.from(selected);
    if (!window.confirm(`${ids.length} işçinin featured'i kaldırılacak. Devam?`)) return;
    setBusy(true);
    try {
      const res = await api.bulkUnfeatureUsers(ids);
      window.alert(`${res.updated} güncellendi, ${res.notFound.length} bulunamadı`);
      load();
    } catch (e) {
      window.alert(`Hata: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-green-600 text-white px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
      {badgeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold mb-1">Rozet Yönet</h3>
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">{badgeTarget.fullName}</span> için manuel rozetleri seç.
            </p>
            <div className="space-y-2">
              {MANUAL_BADGES.map(b => {
                const on = badgeChecked.has(b.key);
                return (
                  <label key={b.key} className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setBadgeChecked(prev => {
                          const n = new Set(prev);
                          if (n.has(b.key)) n.delete(b.key); else n.add(b.key);
                          return n;
                        });
                      }}
                    />
                    <span className="text-lg">{b.emoji}</span>
                    <span className="text-sm font-medium">{b.label}</span>
                    <code className="ml-auto text-xs text-gray-400">{b.key}</code>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setBadgeTarget(null)}
                disabled={badgeBusy}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >İptal</button>
              <button
                onClick={saveBadges}
                disabled={badgeBusy}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >{badgeBusy ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold mb-1">Kullanıcıyı Askıya Al</h3>
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">{suspendTarget.fullName}</span> askıya alınacak. Sebep zorunlu.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value.slice(0, 500))}
              rows={4}
              maxLength={500}
              placeholder="Askıya alma sebebi…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="mt-1 text-right text-xs text-gray-400">{suspendReason.length}/500</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setSuspendTarget(null); setSuspendReason(""); }}
                disabled={suspendBusy}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >İptal</button>
              <button
                onClick={doSuspend}
                disabled={suspendBusy || !suspendReason.trim()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >{suspendBusy ? "Askıya alınıyor…" : "Askıya Al"}</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Kullanıcılar</h2>
        <span className="text-sm text-gray-400">{users.length} kullanıcı</span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {selected.size > 0 && (
        <div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-blue-900">{selected.size} seçili</span>
          <div className="flex gap-2">
            <button
              onClick={() => bulkVerify(true)}
              disabled={busy}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >Doğrula</button>
            <button
              onClick={() => bulkVerify(false)}
              disabled={busy}
              className="rounded-md bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >Doğrulamayı Kaldır</button>
            <div className="relative">
              <button
                onClick={() => setFeatureMenu(v => !v)}
                disabled={busy}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >⭐ Featured Yap</button>
              {featureMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 rounded-md border border-gray-200 bg-white shadow-lg">
                  {[1, 2, 3].map(s => (
                    <button
                      key={s}
                      onClick={() => bulkFeature(s as 1 | 2 | 3)}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-amber-50"
                    >Slot {s}</button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={bulkUnfeature}
              disabled={busy}
              className="rounded-md bg-orange-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-50"
            >Featured Kaldır</button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={busy}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >Temizle</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm animate-pulse">Yükleniyor…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Tümünü seç"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">E-posta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Telefon</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Rol</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Tel. Doğr.</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Kimlik</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Durum</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Kayıt</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Henüz kullanıcı yok.</td></tr>
              )}
              {users.map(u => {
                const role = ROLE_MAP[u.role] ?? { label: u.role, cls: "bg-gray-100 text-gray-600" };
                const checked = selected.has(u.id);
                return (
                  <tr key={u.id} className={`transition-colors ${checked ? "bg-blue-50/60" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(u.id)}
                        aria-label={`${u.fullName} seç`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{u.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{u.phoneNumber}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${role.cls}`}>
                        {role.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.isPhoneVerified
                        ? <span className="text-green-600 font-medium">✓</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.identityVerified
                        ? <span className="text-blue-600 font-medium">✓</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.suspended ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"
                          title={u.suspendedReason ?? ""}
                        >Askıda</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openBadgeModal(u)}
                          className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          title={(u.manualBadges ?? []).join(", ") || "Rozet yok"}
                        >🏅 Rozet{(u.manualBadges?.length ?? 0) > 0 ? ` (${u.manualBadges!.length})` : ""}</button>
                        {u.suspended ? (
                          <button
                            onClick={() => doUnsuspend(u)}
                            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                          >Askıyı Kaldır</button>
                        ) : (
                          <button
                            onClick={() => { setSuspendTarget(u); setSuspendReason(""); }}
                            disabled={u.role === "admin"}
                            className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >Askıya Al</button>
                        )}
                      </div>
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
