"use client";

/**
 * Phase 268 — Realtime Analytics
 *
 * Live operational dashboard for admin: online users pulse + 7d activity KPIs
 * + recent session sample. Auto-refreshes every 10s.
 *
 * Data sources:
 *   GET /admin/realtime/online   — in-memory online socket count (RealtimeService)
 *   GET /admin/realtime/sessions — User.lastSeenAt sample (50)
 *   GET /admin/stats             — enriched with usersOnlineNow / signups7d / jobs7d / activeWorkers7d
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type StatsPayload = Awaited<ReturnType<typeof api.getEnrichedStats>>;
type OnlinePayload = Awaited<ReturnType<typeof api.getRealtimeOnline>>;
type SessionsPayload = Awaited<ReturnType<typeof api.getRealtimeSessions>>;

const REFRESH_MS = 10_000;

function StatCard({
  label,
  value,
  icon,
  accent,
  pulse,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 p-6 shadow-sm backdrop-blur-md transition hover:shadow-md`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl ${accent}`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {label}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {typeof value === "number" ? value.toLocaleString("tr-TR") : value}
            </span>
            {pulse && (
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function MiniTrend({
  data,
  color,
  label,
}: {
  data: Array<{ date: string; count: number }>;
  color: string;
  label: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-400">
        {label} verisi yok
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-2xl border border-white/40 bg-white/70 p-6 shadow-sm backdrop-blur-md">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">{label}</h3>
      <div className="flex h-32 items-end gap-1">
        {data.map((d, i) => {
          const h = Math.max(4, Math.round((d.count / max) * 100));
          return (
            <div
              key={i}
              className="group flex flex-1 flex-col items-center"
              title={`${d.date}: ${d.count}`}
            >
              <div
                className={`w-full rounded-t ${color} transition-all group-hover:opacity-80`}
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "şimdi";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}d önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa önce`;
  return `${Math.floor(h / 24)}g önce`;
}

export default function RealtimeAnalyticsPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [online, setOnline] = useState<OnlinePayload | null>(null);
  const [sessions, setSessions] = useState<SessionsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastTick, setLastTick] = useState<Date>(new Date());

  async function load() {
    try {
      const [s, o, ss] = await Promise.all([
        api.getEnrichedStats(),
        api.getRealtimeOnline(),
        api.getRealtimeSessions(7),
      ]);
      setStats(s);
      setOnline(o);
      setSessions(ss);
      setLastTick(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* animated bg */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-emerald-200 opacity-30 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-blue-200 opacity-25 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 rounded-full bg-purple-200 opacity-20 blur-3xl" />
      </div>

      <div className="space-y-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Realtime Analytics</h1>
            <p className="text-sm text-gray-500">
              10 saniyede bir otomatik yenilenir · son güncelleme{" "}
              {lastTick.toLocaleTimeString("tr-TR")}
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            Yenile
          </button>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !stats && (
          <div className="text-sm text-gray-500">Yükleniyor…</div>
        )}

        {/* Top KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Online Kullanıcı"
            value={online?.count ?? stats?.usersOnlineNow ?? 0}
            icon="🟢"
            accent="bg-emerald-400"
            pulse
          />
          <StatCard
            label="Son 7 Gün Kayıt"
            value={stats?.signupsLast7d ?? 0}
            icon="✨"
            accent="bg-blue-400"
          />
          <StatCard
            label="Son 7 Gün İlan"
            value={stats?.jobsLast7d ?? 0}
            icon="📋"
            accent="bg-purple-400"
          />
          <StatCard
            label="Aktif Usta (7g)"
            value={stats?.activeWorkers7d ?? 0}
            icon="👷"
            accent="bg-amber-400"
          />
        </div>

        {/* Trend charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MiniTrend
            label="Günlük Yeni Kullanıcı (7g)"
            data={stats?.chartData?.usersPerDay ?? []}
            color="bg-blue-500"
          />
          <MiniTrend
            label="Günlük Yeni İlan (7g)"
            data={stats?.chartData?.jobsPerDay ?? []}
            color="bg-purple-500"
          />
        </div>

        {/* Online users + recent sessions */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/40 bg-white/70 p-6 shadow-sm backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Şu Anda Online ({online?.count ?? 0})
              </h3>
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            {online && online.users.length > 0 ? (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {online.users.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-emerald-50"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="truncate">{u.fullName || u.id}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Şu anda online kullanıcı yok.</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/70 p-6 shadow-sm backdrop-blur-md">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Son 7 Gün Görülen (örnek 50)
            </h3>
            {sessions && sessions.users.length > 0 ? (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {sessions.users.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          u.isOnline ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                      />
                      <span className="truncate">{u.fullName || u.id}</span>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {relativeTime(u.lastSeenAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Bu pencerede aktivite yok.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
