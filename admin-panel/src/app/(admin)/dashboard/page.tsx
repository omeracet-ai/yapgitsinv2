"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Job } from "@/lib/api";

interface Stats {
  totalJobs: number;
  totalUsers: number;
  totalProviders: number;
  verifiedProviders: number;
}

const STATUS_CLS: Record<string, string> = {
  open:        "bg-green-100 text-green-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed:   "bg-blue-100 text-blue-700",
  cancelled:   "bg-red-100 text-red-600",
};
const STATUS_LBL: Record<string, string> = {
  open: "Açık", in_progress: "Devam", completed: "Tamamlandı", cancelled: "İptal",
};

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [jobs,  setJobs]      = useState<Job[]>([]);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.stats(), api.recentJobs(5)])
      .then(([s, j]) => { setStats(s); setJobs(j); })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 text-sm animate-pulse">Yükleniyor…</p>;

  return (
    <div className="space-y-8 max-w-5xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* İstatistik kartları */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Genel Bakış</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Toplam İlan",    value: stats?.totalJobs,          icon: "📋", cls: "bg-blue-50 border-blue-200" },
            { label: "Kullanıcı",      value: stats?.totalUsers,         icon: "👥", cls: "bg-green-50 border-green-200" },
            { label: "Sağlayıcı",      value: stats?.totalProviders,     icon: "👷", cls: "bg-purple-50 border-purple-200" },
            { label: "Doğrulanmış ✓",  value: stats?.verifiedProviders,  icon: "✅", cls: "bg-teal-50 border-teal-200" },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border p-5 ${c.cls}`}>
              <p className="text-2xl mb-1">{c.icon}</p>
              <p className="text-3xl font-bold text-gray-800">{c.value ?? "—"}</p>
              <p className="text-sm text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Son ilanlar */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Son İlanlar</h2>
          <Link href="/jobs" className="text-sm text-blue-600 hover:underline">Tümünü Gör →</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 divide-y divide-gray-100">
          {jobs.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">Henüz ilan yok.</p>
          )}
          {jobs.map(j => (
            <div key={j.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{j.title}</p>
                <p className="text-xs text-gray-400">
                  {j.category} · {j.location}
                  {j.customer?.fullName && ` · ${j.customer.fullName}`}
                </p>
              </div>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[j.status]}`}>
                {STATUS_LBL[j.status]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
