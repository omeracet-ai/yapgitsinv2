"use client";

import { useEffect, useState } from "react";
import { api, type User } from "@/lib/api";

const ROLE_MAP: Record<string, { label: string; cls: string }> = {
  admin:    { label: "Admin",    cls: "bg-red-100 text-red-700" },
  worker:   { label: "İşçi",    cls: "bg-purple-100 text-purple-700" },
  customer: { label: "Müşteri", cls: "bg-blue-100 text-blue-700" },
};

export default function UsersPage() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    api.users()
      .then(setUsers)
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Kullanıcılar</h2>
        <span className="text-sm text-gray-400">{users.length} kullanıcı</span>
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
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">E-posta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Telefon</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Rol</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Tel. Doğr.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Kayıt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Henüz kullanıcı yok.</td></tr>
              )}
              {users.map(u => {
                const role = ROLE_MAP[u.role] ?? { label: u.role, cls: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
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
