"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type HealthStatus } from "@/lib/api";

function formatUptime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}g ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function statusTone(status: string, dbConnected: boolean): {
  bg: string; text: string; ring: string; label: string;
} {
  if (status === "ok" && dbConnected) {
    return { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-500/40", label: "Sağlıklı" };
  }
  if (status === "down" || !dbConnected) {
    return { bg: "bg-red-500/15", text: "text-red-400", ring: "ring-red-500/40", label: "Çalışmıyor" };
  }
  return { bg: "bg-amber-500/15", text: "text-amber-400", ring: "ring-amber-500/40", label: "Sorunlu" };
}

export default function StatusPage() {
  const [data, setData] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const h = await api.getHealth();
      setData(h);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası");
      setData(null);
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const tone = data
    ? statusTone(data.status, data.database.connected)
    : statusTone("down", false);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sistem Durumu</h1>
          <p className="text-sm text-slate-500 mt-1">
            Backend canlı sağlık raporu — 30 saniyede bir otomatik yenilenir.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          Yenile
        </button>
      </div>

      {loading && !data && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
          Yükleniyor…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-900">Backend erişilemiyor</p>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className={`px-6 py-5 border-b border-slate-200 flex items-center justify-between ${tone.bg}`}>
            <div className="flex items-center gap-3">
              <span className={`inline-flex h-3 w-3 rounded-full ring-4 ${tone.ring} ${tone.text.replace("text-", "bg-")}`} />
              <div>
                <p className={`text-sm font-semibold ${tone.text}`}>{tone.label}</p>
                <p className="text-xs text-slate-600 mt-0.5">status: {data.status}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Son güncelleme</p>
              <p className="text-sm font-medium text-slate-700">
                {lastFetch?.toLocaleTimeString("tr-TR") ?? "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <Stat label="Çalışma Süresi" value={formatUptime(data.uptime)} hint="gün SS:DD" />
            <Stat
              label="Veritabanı"
              value={data.database.connected ? "Bağlı" : "Kopuk"}
              hint={`${data.database.latencyMs} ms gecikme`}
              valueClass={data.database.connected ? "text-emerald-600" : "text-red-600"}
            />
            <Stat label="Sürüm" value={data.version} hint="backend version" />
            <Stat label="Ortam" value={data.env} hint="NODE_ENV" />
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 font-mono">
            timestamp: {data.timestamp}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label, value, hint, valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="px-6 py-5">
      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass ?? "text-slate-900"}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
