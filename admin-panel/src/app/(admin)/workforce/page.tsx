"use client";

// Default to /agents/ on production (deployed alongside admin), localhost:5173 in dev.
const AGENTS_URL =
  process.env.NEXT_PUBLIC_AGENTS_URL ??
  (typeof window !== "undefined" && window.location.hostname.endsWith("yapgitsin.tr")
    ? "/agents/"
    : "http://localhost:5173");

export default function WorkforcePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">Canlı AI İş Gücü</h2>
        <p className="text-sm text-slate-500">
          Sistemdeki gerçek işleri ve agent aktivitelerini 2D ofis ortamında izleyin.
          Yeni üye katıldıkça müdür sevinç gösterir 🎉
        </p>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative min-h-[600px]">
        <iframe
          src={AGENTS_URL}
          className="absolute inset-0 w-full h-full border-0"
          title="AI Workforce Monitor"
          allow="autoplay"
        />
      </div>

      <div className="mt-4 flex gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Canlı Bağlantı Aktif
        </div>
        <div>API: yapgitsin.tr/backend</div>
        <div>Yeni üye polling: 15 sn</div>
      </div>
    </div>
  );
}
