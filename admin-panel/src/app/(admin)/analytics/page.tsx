"use client";

import { useEffect, useState } from "react";
import { analyticsApi, type AnalyticsOverview, type WorkerAnalytics, type LeadAnalytics, type RevenueAnalytics } from "@/lib/api";

// Simple bar chart component
function BarChart({ data, label, color }: { data: { name: string; value: number }[], label: string, color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{label}</h3>
      <div className="space-y-3">
        {data.map((d, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-600 truncate pr-2">{d.name}</span>
              <span className="text-xs font-bold text-gray-700 shrink-0">{d.value.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`${color} h-2 rounded-full transition-all`}
                style={{ width: `${(d.value / max) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ label, value, icon, subtext }: { label: string; value: string | number; icon: string; subtext?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [workers, setWorkers] = useState<WorkerAnalytics[]>([]);
  const [leads, setLeads] = useState<LeadAnalytics | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setError(null);
        const [overviewData, workersData, leadsData, revenueData] = await Promise.all([
          analyticsApi.overview(),
          analyticsApi.workers(),
          analyticsApi.leads(),
          analyticsApi.revenue(),
        ]);
        setOverview(overviewData);
        setWorkers(workersData);
        setLeads(leadsData);
        setRevenue(revenueData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) return <p className="text-gray-400 text-sm animate-pulse">Veriler yükleniyor…</p>;

  return (
    <div className="space-y-8 max-w-7xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* Overview Cards */}
      {overview && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Genel Bakış</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Toplam İş Talebi" value={overview.totalLeads} icon="📋" />
            <StatCard label="Aktif Talepler" value={overview.activeLeads} icon="🔴" />
            <StatCard label="Usta Sayısı" value={overview.totalWorkers} icon="👷" />
            <StatCard label="Müşteri Sayısı" value={overview.totalCustomers} icon="👤" />
            <StatCard label="Toplam Rezervasyon" value={overview.totalBookings} icon="📅" />
            <StatCard label="Tamamlanan İş" value={overview.completedBookings} icon="✅" />
            <StatCard label="Toplam Gelir" value={`₺${overview.totalRevenue.toLocaleString()}`} icon="💰" />
            <StatCard label="Dönüşüm Oranı" value={`${overview.leadConversionRate.toFixed(1)}%`} icon="📊" subtext="Yanıt alan talepler" />
          </div>
        </section>
      )}

      {/* Leads Analytics */}
      {leads && (
        <section>
          <h2 className="text-lg font-semibold mb-4">İş Talebi Analizi</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Talep Durumları</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Açık</span>
                  <span className="font-bold text-gray-800">{leads.openLeads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Devam Eden</span>
                  <span className="font-bold text-gray-800">{leads.inProgressLeads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tamamlanan</span>
                  <span className="font-bold text-gray-800">{leads.closedLeads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Süresi Dolmuş</span>
                  <span className="font-bold text-gray-800">{leads.expiredLeads}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-700">Toplam</span>
                  <span className="font-bold text-gray-800">{leads.totalLeads}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dönüşüm Oranı</p>
                    <p className="text-3xl font-bold text-gray-800">{leads.conversionRate.toFixed(1)}%</p>
                  </div>
                  <span className="text-3xl">📈</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ortalama Yanıt Sayısı</p>
                    <p className="text-3xl font-bold text-gray-800">{leads.averageResponseCount.toFixed(2)}</p>
                  </div>
                  <span className="text-3xl">💬</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Categories */}
          {leads.topCategories.length > 0 && (
            <div>
              <BarChart
                data={leads.topCategories.map(c => ({ name: c.category, value: c.count }))}
                label="En Çok Talep Edilen Kategoriler"
                color="bg-blue-500"
              />
            </div>
          )}
        </section>
      )}

      {/* Revenue Analytics */}
      {revenue && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Gelir Analizi</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Toplam Gelir"
              value={`₺${revenue.totalRevenue.toLocaleString()}`}
              icon="💰"
            />
            <StatCard
              label="Ort. İşlem Değeri"
              value={`₺${revenue.averageTransactionValue.toLocaleString()}`}
              icon="💵"
            />
            <StatCard
              label="En Yüksek Kategori"
              value={revenue.revenueByCategory[0]?.category || "-"}
              icon="🏆"
              subtext={`₺${revenue.revenueByCategory[0]?.revenue || 0}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Period */}
            {revenue.revenueByPeriod.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Dönemsel Gelir</h3>
                <div className="space-y-3">
                  {revenue.revenueByPeriod.slice(-6).reverse().map((period, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-600">{period.period}</span>
                        <span className="text-xs font-bold text-gray-700">₺{period.revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((period.revenue / Math.max(...revenue.revenueByPeriod.map(p => p.revenue))) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{period.bookingCount} işlem</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue by Category */}
            {revenue.revenueByCategory.length > 0 && (
              <BarChart
                data={revenue.revenueByCategory.slice(0, 8).map(c => ({ name: c.category, value: c.revenue }))}
                label="Kategori Başına Gelir"
                color="bg-emerald-500"
              />
            )}
          </div>
        </section>
      )}

      {/* Worker Analytics */}
      {workers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Usta Performansı</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Usta Adı</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Toplam İş</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Tamamlanan</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Başarı %</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Ort. Yanıt Süresi</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Toplam Kazanç</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workers.slice(0, 10).map(w => (
                  <tr key={w.workerId} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-700 font-medium truncate">{w.workerName}</td>
                    <td className="text-center px-4 py-3 text-gray-600">{w.totalBookings}</td>
                    <td className="text-center px-4 py-3 text-gray-600">{w.completedBookings}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`font-semibold ${w.successRate >= 80 ? 'text-green-600' : w.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {w.successRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center px-4 py-3 text-gray-600">{w.averageResponseTime.toFixed(0)} dk</td>
                    <td className="text-center px-4 py-3 font-semibold text-gray-700">₺{w.totalEarnings.toLocaleString()}</td>
                    <td className="text-center px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-gray-700">{w.averageRating.toFixed(1)}</span>
                        <span className="text-yellow-500">⭐</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {workers.length > 10 && (
            <p className="text-xs text-gray-500 mt-2">En iyi 10 usta gösteriliyor, toplam {workers.length} usta</p>
          )}
        </section>
      )}
    </div>
  );
}
