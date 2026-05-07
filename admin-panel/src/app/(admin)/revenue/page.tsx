"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Revenue {
  totalGross: number;
  totalPlatformFee: number;
  totalTaskerNet: number;
  releasedCount: number;
  last30Days: {
    totalGross: number;
    totalPlatformFee: number;
    totalTaskerNet: number;
    releasedCount: number;
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);

export default function RevenuePage() {
  const [data, setData] = useState<Revenue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.revenue()
      .then((r) => setData(r))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 text-sm animate-pulse">Yükleniyor…</p>;

  return (
    <div className="space-y-8 max-w-6xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* Toplam Kartlar */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Tüm Zamanlar</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Toplam Gelir",      value: data ? fmt(data.totalGross)       : "—", icon: "💵", cls: "bg-blue-50 border-blue-100" },
            { label: "Komisyon Gelirimiz", value: data ? fmt(data.totalPlatformFee) : "—", icon: "💰", cls: "bg-emerald-50 border-emerald-100" },
            { label: "Ustaya Net",        value: data ? fmt(data.totalTaskerNet)   : "—", icon: "👷", cls: "bg-purple-50 border-purple-100" },
            { label: "İş Sayısı",         value: data ? data.releasedCount         : "—", icon: "✅", cls: "bg-teal-50 border-teal-100" },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border p-5 ${c.cls} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{c.icon}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{c.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Son 30 Gün */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Son 30 Gün</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">Metrik</th>
                <th className="text-right px-5 py-3">Değer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-5 py-3 font-medium">Toplam Gelir</td>
                <td className="px-5 py-3 text-right">{data ? fmt(data.last30Days.totalGross) : "—"}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium">Komisyon Gelirimiz</td>
                <td className="px-5 py-3 text-right">{data ? fmt(data.last30Days.totalPlatformFee) : "—"}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium">Ustaya Net</td>
                <td className="px-5 py-3 text-right">{data ? fmt(data.last30Days.totalTaskerNet) : "—"}</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium">İş Sayısı</td>
                <td className="px-5 py-3 text-right">{data ? data.last30Days.releasedCount : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
