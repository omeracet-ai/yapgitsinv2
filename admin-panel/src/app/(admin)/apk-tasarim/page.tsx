"use client";

/**
 * /apk-tasarim — Theme tokens + branding studio for the mobile app.
 * Three glass cards: theme tokens, branding, save/preview actions.
 */

import { useCallback, useEffect, useState } from "react";
import { api, type AdminAppConfig, type AppConfigBranding, type AppConfigThemeTokens } from "@/lib/api";
import { ApkPreviewModal } from "@/components/apk-preview/ApkPreviewModal";

const DEFAULT_TOKENS: AppConfigThemeTokens = {
  primary: "#FF5A1F",
  surface: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#64748B",
  radius: 16,
  font: "Inter",
};

const DEFAULT_BRANDING: AppConfigBranding = {
  appTitle: "Yapgitsin",
  logoUrl: "",
  iconUrl: "",
  splashUrl: "",
};

const FONT_OPTIONS = ["Inter", "Roboto", "Poppins", "Manrope", "SF Pro", "System"];

function GlassCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:-translate-y-0.5 transition-transform duration-200">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">{label}</span>
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm font-mono text-white outline-none px-1"
          spellCheck={false}
        />
      </div>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400/40 transition"
      />
    </label>
  );
}

export default function ApkTasarimPage() {
  const [tokens, setTokens] = useState<AppConfigThemeTokens>(DEFAULT_TOKENS);
  const [branding, setBranding] = useState<AppConfigBranding>(DEFAULT_BRANDING);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data: AdminAppConfig = await api.getAdminAppConfig();
      const activeTheme = data.themes?.find((t) => t.isActive) ?? data.themes?.[0];
      if (activeTheme) {
        setActiveThemeId(activeTheme.id);
        setTokens({ ...DEFAULT_TOKENS, ...activeTheme.tokens });
      }
      if (data.branding) setBranding({ ...DEFAULT_BRANDING, ...data.branding });
    } catch {
      // Backend not yet wired — keep defaults so the studio is still usable.
    }
  }, []);

  useEffect(() => {
    // Defer the setState-bearing fetch out of the effect body to keep
    // react-hooks/set-state-in-effect happy.
    const id = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const setToken = (k: keyof AppConfigThemeTokens, v: string | number) =>
    setTokens((p) => ({ ...p, [k]: v }));

  const flash = (kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 2500);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Theme: update active or create new
      if (activeThemeId) {
        await api.patchTheme(activeThemeId, { tokens });
      } else {
        const created = await api.postTheme({ name: "Default", tokens, isActive: true });
        setActiveThemeId(created.id);
      }
      await api.patchBranding(branding);
      flash("ok", "Kaydedildi ✓");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full -m-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🎨 APK Tasarım Studio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Mobil uygulamanın renkleri, tipografi ve markası — canlı önizleme ile.
          </p>
        </div>
        <button
          onClick={() => setPreviewOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition"
        >
          📱 APK Önizleme
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium border ${
            toast.kind === "ok"
              ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200"
              : "bg-red-500/10 border-red-400/30 text-red-200"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Theme tokens */}
        <GlassCard title="Renk Tokens" subtitle="Tema renkleri (canlı yansır)">
          <div className="space-y-3">
            <ColorField label="Primary" value={String(tokens.primary ?? "#FF5A1F")} onChange={(v) => setToken("primary", v)} />
            <ColorField label="Surface" value={String(tokens.surface ?? "#FFFFFF")} onChange={(v) => setToken("surface", v)} />
            <ColorField label="Text"    value={String(tokens.text    ?? "#1F2937")} onChange={(v) => setToken("text", v)} />
            <ColorField label="Text Muted" value={String(tokens.textMuted ?? "#64748B")} onChange={(v) => setToken("textMuted", v)} />
          </div>
        </GlassCard>

        {/* Typography & shape */}
        <GlassCard title="Tipografi & Şekil" subtitle="Font + köşe yuvarlaklığı">
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">Font</span>
              <select
                value={String(tokens.font ?? "Inter")}
                onChange={(e) => setToken("font", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40 transition"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f} className="bg-slate-900">{f}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">
                Radius — <span className="text-white">{tokens.radius ?? 16}px</span>
              </span>
              <input
                type="range"
                min={0}
                max={32}
                value={Number(tokens.radius ?? 16)}
                onChange={(e) => setToken("radius", Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </label>
            <div className="pt-2">
              <div
                className="px-4 py-3 text-white text-sm font-bold text-center"
                style={{
                  background: String(tokens.primary ?? "#FF5A1F"),
                  borderRadius: Number(tokens.radius ?? 16),
                  fontFamily: String(tokens.font ?? "Inter") + ", system-ui, sans-serif",
                }}
              >
                Buton Önizleme
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Branding */}
        <GlassCard title="Marka" subtitle="Logo, ikon, splash">
          <div className="space-y-3">
            <TextField
              label="Uygulama Adı"
              value={branding.appTitle ?? ""}
              onChange={(v) => setBranding((p) => ({ ...p, appTitle: v }))}
              placeholder="Yapgitsin"
            />
            <TextField
              label="Logo URL"
              value={branding.logoUrl ?? ""}
              onChange={(v) => setBranding((p) => ({ ...p, logoUrl: v }))}
              placeholder="https://…/logo.png"
            />
            <TextField
              label="Icon URL"
              value={branding.iconUrl ?? ""}
              onChange={(v) => setBranding((p) => ({ ...p, iconUrl: v }))}
              placeholder="https://…/icon.png"
            />
            <TextField
              label="Splash URL"
              value={branding.splashUrl ?? ""}
              onChange={(v) => setBranding((p) => ({ ...p, splashUrl: v }))}
              placeholder="https://…/splash.png"
            />
            {/* Preview thumbs */}
            <div className="flex gap-2 pt-2">
              {[
                { src: branding.logoUrl, lbl: "Logo" },
                { src: branding.iconUrl, lbl: "Icon" },
                { src: branding.splashUrl, lbl: "Splash" },
              ].map((b) => (
                <div key={b.lbl} className="flex-1">
                  <div className="aspect-square rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {b.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.src} alt={b.lbl} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="text-[10px] text-slate-500">{b.lbl}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Footer save bar */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          onClick={() => void load()}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-medium transition"
        >
          ↺ Sıfırla
        </button>
        <button
          onClick={() => void saveAll()}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 transition disabled:opacity-50"
        >
          {saving ? "Kaydediliyor…" : "💾 Kaydet"}
        </button>
      </div>

      <ApkPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
