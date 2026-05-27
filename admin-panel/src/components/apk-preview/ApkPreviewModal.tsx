"use client";

/**
 * APK Preview Modal — pure Tailwind + inline-style phone mockup.
 * Fetches /app-config live, applies theme tokens + branding into a 390x844
 * "iPhone-ish" 3D-perspective phone. ESC / backdrop / X to close.
 */

import { useCallback, useEffect, useState } from "react";
import { api, type AppConfigPublic } from "@/lib/api";
import { PhoneFrame3D } from "./PhoneFrame3D";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TABS = [
  { key: "yaptir",    label: "Yaptır",    icon: "🛠️" },
  { key: "yapgitsin", label: "Yapgitsin", icon: "⚡" },
  { key: "harita",    label: "Harita",    icon: "🗺️" },
  { key: "islerim",   label: "İşlerim",   icon: "📋" },
  { key: "profil",    label: "Profil",    icon: "👤" },
];

const FALLBACK: AppConfigPublic = {
  branding: { appTitle: "Yapgitsin", logoUrl: null, iconUrl: null, splashUrl: null },
  theme: { primary: "#FF5A1F", surface: "#FFFFFF", text: "#1F2937", radius: 16, font: "Inter" },
  settings: {},
  layouts: [],
};

export function ApkPreviewModal({ open, onClose }: Props) {
  const [cfg, setCfg] = useState<AppConfigPublic>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("yapgitsin");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAppConfig();
      // Tolerate partial backends — merge over the fallback so the mockup still renders.
      setCfg({
        branding: { ...FALLBACK.branding, ...(data?.branding ?? {}) },
        theme:    { ...FALLBACK.theme,    ...(data?.theme ?? {}) },
        settings: data?.settings ?? {},
        layouts:  data?.layouts ?? [],
      });
    } catch {
      setCfg(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // Defer the setState-bearing fetch out of the effect body to keep the
    // react-hooks/set-state-in-effect rule satisfied.
    const id = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(id);
  }, [open, refresh]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const primary = String(cfg.theme.primary ?? "#FF5A1F");
  const surface = String(cfg.theme.surface ?? "#FFFFFF");
  const text    = String(cfg.theme.text ?? "#1F2937");
  const radius  = Number(cfg.theme.radius ?? 16);
  const title   = cfg.branding.appTitle ?? "Yapgitsin";
  const logoUrl = cfg.branding.logoUrl ?? cfg.branding.iconUrl ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); void refresh(); }}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md border border-white/20 transition disabled:opacity-50"
        >
          {loading ? "Yenileniyor…" : "↻ Yenile"}
        </button>
        <button
          onClick={onClose}
          aria-label="Kapat"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg backdrop-blur-md border border-white/20 transition"
        >
          ✕
        </button>
      </div>

      {/* Phone mockup — interactive 3D rotate */}
      <div onClick={(e) => e.stopPropagation()}>
        <PhoneFrame3D width={390} height={844} bezelRadius={60} bezelPadding={14}>
          {/* Screen */}
          <div
            className="w-full h-full overflow-hidden relative flex flex-col"
            style={{
              borderRadius: 48,
              background: surface,
              color: text,
              fontFamily: String(cfg.theme.font ?? "Inter") + ", system-ui, sans-serif",
            }}
          >
            {/* Status bar */}
            <div className="flex items-center justify-between px-8 pt-3 pb-1 text-[11px] font-semibold" style={{ color: text }}>
              <span>09:41</span>
              <span>•••</span>
              <span>100%</span>
            </div>

            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: `1px solid ${text}15` }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ background: primary }}
                >
                  {title.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="text-base font-bold leading-tight">{title}</div>
                <div className="text-[11px] opacity-60">Türkiye&apos;nin hizmet pazaryeri</div>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                style={{ background: `${primary}15`, color: primary }}
              >
                🔔
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Featured CTA card — primary color */}
              <div
                className="p-4 text-white shadow-lg"
                style={{ background: primary, borderRadius: radius }}
              >
                <div className="text-[11px] opacity-90 font-medium">⚡ Hızlı Başlat</div>
                <div className="text-lg font-bold mt-0.5">İhtiyacın Olan Hizmeti Bul</div>
                <div className="text-xs opacity-90 mt-1">Dakikalar içinde teklif al</div>
                <button
                  className="mt-3 px-4 py-1.5 rounded-lg bg-white/95 text-xs font-bold"
                  style={{ color: primary }}
                >
                  Hemen Başla →
                </button>
              </div>

              {/* Category strip */}
              <div className="flex gap-2 overflow-x-auto py-1 -mx-1 px-1">
                {["🔌 Elektrik", "🧹 Temizlik", "🎨 Boya", "🔧 Tesisat", "🚚 Nakliye"].map((c) => (
                  <div
                    key={c}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                    style={{
                      background: `${primary}10`,
                      color: primary,
                      borderRadius: radius / 2,
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>

              {/* Sample job cards */}
              {[
                { t: "Salon Boyası Lazım", c: "İstanbul · Kadıköy", p: "₺1.500–2.500" },
                { t: "Lavabo Sızdırıyor",  c: "Ankara · Çankaya",  p: "₺300–500"   },
                { t: "Klima Bakımı",       c: "İzmir · Karşıyaka", p: "₺400–600"   },
              ].map((j) => (
                <div
                  key={j.t}
                  className="p-3 border"
                  style={{
                    borderRadius: radius,
                    borderColor: `${text}10`,
                    background: surface,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: text }}>{j.t}</div>
                      <div className="text-[11px] opacity-60 mt-0.5">{j.c}</div>
                    </div>
                    <div
                      className="text-xs font-bold px-2 py-1"
                      style={{ background: `${primary}15`, color: primary, borderRadius: radius / 2 }}
                    >
                      {j.p}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab bar */}
            <div
              className="flex items-center justify-around px-2 pt-2 pb-6"
              style={{ borderTop: `1px solid ${text}10`, background: surface }}
            >
              {TABS.map((t) => {
                const active = t.key === activeTab;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className="flex flex-col items-center gap-0.5 px-2 py-1"
                    style={{ color: active ? primary : `${text}80` }}
                  >
                    <span className="text-lg leading-none">{t.icon}</span>
                    <span className="text-[10px] font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </PhoneFrame3D>
      </div>
    </div>
  );
}
