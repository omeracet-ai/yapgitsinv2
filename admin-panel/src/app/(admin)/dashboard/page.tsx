"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Job } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface AnalyticsOverview {
  dailyRegistrations: Array<{ date: string; count: number }>;
  dailyJobs: Array<{ date: string; count: number }>;
  topCategories: Array<{ name: string; jobCount: number }>;
}

interface Stats {
  totalJobs: number;
  totalUsers: number;
  totalProviders: number;
  verifiedProviders: number;
  chartData?: {
    jobsPerDay: Array<{ date: string; count: number }>;
    usersPerDay: Array<{ date: string; count: number }>;
  };
}

interface PublicStats {
  totalJobs: number;
  totalWorkers: number;
  completedJobs: number;
  totalCategories: number;
}

function SimpleChart({ data, label, color }: { data: any[], label: string, color: string }) {
  const max = Math.max(...data.map(d => d.count), 5);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-6">{label}</h3>
      <div className="flex items-end justify-between h-40 gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            <div 
              className={`w-full rounded-t-lg transition-all duration-500 ${color}`}
              style={{ height: `${(d.count / max) * 100}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {d.count} adet
              </div>
            </div>
            <span className="text-[10px] text-gray-400 mt-2 rotate-[-45deg] origin-top-left">{d.date.split('.')[0]}/{d.date.split('.')[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
  const [stats, setStats]           = useState<Stats | null>(null);
  const [pubStats, setPubStats]     = useState<PublicStats | null>(null);
  const [jobs,  setJobs]            = useState<Job[]>([]);
  const [analytics, setAnalytics]   = useState<AnalyticsOverview | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  async function fetchAnalytics() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/analytics/overview`, { credentials: "include" });
      if (res.ok) setAnalytics(await res.json());
    } catch { /* non-fatal */ }
  }

  useEffect(() => {
    Promise.all([api.stats(), api.recentJobs(5), api.publicStats()])
      .then(([s, j, ps]) => {
        setStats(s as Stats);
        setJobs(j);
        setPubStats(ps as PublicStats);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
    fetchAnalytics();
  }, []);

  if (loading) return <p className="text-gray-400 text-sm animate-pulse">Yükleniyor…</p>;

  return (
    <div className="space-y-8 max-w-6xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* İstatistik kartları */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Genel Bakış</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Toplam İlan",    value: stats?.totalJobs,          icon: "📋", cls: "bg-blue-50 border-blue-100" },
            { label: "Kullanıcı",      value: stats?.totalUsers,         icon: "👥", cls: "bg-emerald-50 border-emerald-100" },
            { label: "Sağlayıcı",      value: stats?.totalProviders,     icon: "👷", cls: "bg-purple-50 border-purple-100" },
            { label: "Doğrulanmış ✓",  value: stats?.verifiedProviders,  icon: "✅", cls: "bg-teal-50 border-teal-100" },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border p-5 ${c.cls} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{c.icon}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">{c.value ?? "—"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Marketplace İstatistikleri — Phase 206 */}
      {pubStats && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Marketplace Genel Durum</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Toplam İlan",        value: pubStats.totalJobs,        icon: "📋", cls: "bg-blue-50 border-blue-100" },
              { label: "Aktif Usta",         value: pubStats.totalWorkers,     icon: "👷", cls: "bg-purple-50 border-purple-100" },
              { label: "Tamamlanan İş",      value: pubStats.completedJobs,    icon: "✅", cls: "bg-green-50 border-green-100" },
              { label: "Kategori",           value: pubStats.totalCategories,  icon: "🗂️", cls: "bg-orange-50 border-orange-100" },
            ].map(c => (
              <div key={c.label} className={`rounded-xl border p-5 ${c.cls} shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{c.icon}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</span>
                </div>
                <p className="text-3xl font-bold text-gray-800">{(c.value ?? 0).toLocaleString('tr-TR')}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recharts — Analytics Overview */}
      {analytics && (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold">Son 30 Gün Analitik</h2>

          {/* LineChart: dailyRegistrations + dailyJobs */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Günlük Kayıt & İlan Trendi</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={analytics.dailyRegistrations.map((r, i) => ({
                  date: r.date,
                  kayit: r.count,
                  ilan: analytics.dailyJobs[i]?.count ?? 0,
                }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="kayit" name="Kayıt" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ilan"  name="İlan"  stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* BarChart: topCategories */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">En Aktif Kategoriler</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.topCategories} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="jobCount" name="İlan" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Eski SimpleChart grafikler (yoksa göster) */}
      {!analytics && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats?.chartData && (
            <>
              <SimpleChart
                data={stats.chartData.jobsPerDay}
                label="Son 7 Gün: İlan Sayısı"
                color="bg-blue-500 group-hover:bg-blue-600"
              />
              <SimpleChart
                data={stats.chartData.usersPerDay}
                label="Son 7 Gün: Yeni Kayıtlar"
                color="bg-emerald-500 group-hover:bg-emerald-600"
              />
            </>
          )}
        </section>
      )}

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
