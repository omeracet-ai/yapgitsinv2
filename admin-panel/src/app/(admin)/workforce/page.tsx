"use client";

import dynamic from "next/dynamic";

// Lazy-load — heavy CSS + canvas-style office sim, no SSR needed
const AgentSim = dynamic(() => import("@/components/AgentSim/AgentSim"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
      AI iş gücü simülatörü yükleniyor…
    </div>
  ),
});

export default function WorkforcePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">Canlı AI İş Gücü</h2>
        <p className="text-sm text-slate-500">
          Yapgitsin AI iş gücünü 2D ofis ortamında izle. Yeni üye katıldığında
          Müdür sevinç gösterir 🎉
        </p>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative min-h-[600px]">
        <AgentSim />
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
