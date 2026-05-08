"use client";

import { useEffect, useState } from "react";
import { api, type User } from "@/lib/api";

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  admin:    { label: "Admin",    cls: "bg-red-100 text-red-700" },
  worker:   { label: "İşçi",    cls: "bg-purple-100 text-purple-700" },
  customer: { label: "Müşteri", cls: "bg-blue-100 text-blue-700" },
};

export default function UsersPage() {
  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy,     setBusy]     = useState(false);

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

  return (
    <div className="max-w-5xl">
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
                <th className="text-right px-4 py-3 font-medium text-gray-500">Kayıt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Henüz kullanıcı yok.</td></tr>
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
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("tr-TR")}
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
