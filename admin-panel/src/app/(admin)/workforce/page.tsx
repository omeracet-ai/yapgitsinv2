"use client";

export default function WorkforcePage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-800">Canlı AI İş Gücü</h2>
        <p className="text-sm text-slate-500">
          Sistemdeki gerçek işleri ve agent aktivitelerini 2D ofis ortamında izleyin.
        </p>
      </div>
      
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative">
        <iframe 
          src="http://localhost:5173" 
          className="absolute inset-0 w-full h-full border-0"
          title="AI Workforce Monitor"
        />
      </div>
      
      <div className="mt-4 flex gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Canlı Bağlantı Aktif
        </div>
        <div>API: localhost:3001</div>
        <div>Entegre Sistem: Yapgitsin v2</div>
      </div>
    </div>
  );
}
