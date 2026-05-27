"use client";

/**
 * /apk-tasarim — Theme Studio (Phase 269 + brief gap-fill).
 * Tabbed sections: Colors / Typography / Spacing & Radius / Motion / Mode.
 * Branding card on the right column. Live preview renders real components.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { api, type AdminAppConfig, type AppConfigBranding, type AppConfigThemeTokens } from "@/lib/api";

const ApkPreviewModal = dynamic(
  () =>
    import("@/components/apk-preview/ApkPreviewModal").then(
      (m) => m.ApkPreviewModal,
    ),
  { ssr: false },
);

interface HistoryEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  payload: Record<string, unknown> | null;
  adminUserId: string | null;
  actorEmail: string | null;
  createdAt: string;
}

/**
 * Extended token shape — backend tokens JSON is open-ended, so we layer extra
 * fields (typography, gradients, spacing/radius scale, motion, mode palettes)
 * on top of the original AppConfigThemeTokens contract.
 */
const DEFAULT_TOKENS: AppConfigThemeTokens = {
  primary: "#FF5A1F",
  surface: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#64748B",
  radius: 16,
  font: "Inter",
  // Typography
  fontWeights: "400,500,600,700" as unknown as string,
  fontSizeXs: 12,
  fontSizeSm: 14,
  fontSizeMd: 16,
  fontSizeLg: 20,
  fontSizeXl: 24,
  fontSize2xl: 32,
  letterSpacing: 0,
  // Gradients
  gradientPrimaryStart: "#FF5A1F",
  gradientPrimaryEnd: "#FFB400",
  gradientHeroStart: "#2D3E50",
  gradientHeroEnd: "#FF5A1F",
  // Radius scale
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 20,
  radiusXl: 28,
  // Spacing scale
  spacingSm: 8,
  spacingMd: 12,
  spacingLg: 20,
  // Motion
  motionFast: 150,
  motionNormal: 250,
  motionSlow: 400,
  motionCurve: "easeOut" as unknown as string,
  // Mode
  mode: "light" as unknown as string,
  darkPrimary: "#FF7A3F",
  darkSurface: "#0F172A",
  darkText: "#F1F5F9",
  darkTextMuted: "#94A3B8",
};

const DEFAULT_BRANDING: AppConfigBranding = {
  appTitle: "Yapgitsin",
  logoUrl: "",
  iconUrl: "",
  splashUrl: "",
};

const FONT_OPTIONS = ["Inter", "Roboto", "Poppins", "Playfair Display", "Manrope", "SF Pro", "System"];
const WEIGHT_OPTIONS = [300, 400, 500, 600, 700, 800];
const CURVE_OPTIONS = ["linear", "easeIn", "easeOut", "easeInOut", "spring"];

type ThemeTab = "colors" | "typography" | "shape" | "motion" | "mode";

function GlassCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
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
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded cursor-pointer bg-transparent border-0" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent text-sm font-mono text-white outline-none px-1" spellCheck={false} />
      </div>
    </label>
  );
}

function NumField({ label, value, onChange, min = 0, max = 200, suffix }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">
        {label} {suffix && <span className="text-slate-500 normal-case">({suffix})</span>}
      </span>
      <input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40 transition font-mono" />
    </label>
  );
}

function BrandingUploadField({ label, kind, value, onChange, placeholder, onError, onSuccess }: {
  label: string; kind: "logo" | "icon" | "splash"; value: string;
  onChange: (v: string) => void; placeholder?: string;
  onError: (msg: string) => void; onSuccess: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return onError("Sadece resim dosyası yükleyin");
    if (file.size > 5 * 1024 * 1024) return onError("Dosya 5MB'dan büyük olamaz");
    setBusy(true);
    try {
      const out = await api.uploadBranding(file, kind);
      onChange(out.url);
      onSuccess(`${label} yüklendi ✓`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Yükleme başarısız");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">{label}</span>
      <div className="flex gap-2">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400/40 transition" />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className="shrink-0 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-50 transition">
          {busy ? "…" : "📤"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0] ?? null)} />
      </div>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400/40 transition" />
    </label>
  );
}

// ─── Live preview — renders real components using current tokens ─────────────
function LivePreview({ t }: { t: AppConfigThemeTokens }) {
  const mode = String(t.mode ?? "light");
  const isDark = mode === "dark";
  const surface = isDark ? String(t.darkSurface ?? "#0F172A") : String(t.surface ?? "#FFFFFF");
  const text = isDark ? String(t.darkText ?? "#F1F5F9") : String(t.text ?? "#1F2937");
  const muted = isDark ? String(t.darkTextMuted ?? "#94A3B8") : String(t.textMuted ?? "#64748B");
  const primary = isDark ? String(t.darkPrimary ?? "#FF7A3F") : String(t.primary ?? "#FF5A1F");
  const r = Number(t.radius ?? 16);
  const rSm = Number(t.radiusSm ?? 8);
  const rMd = Number(t.radiusMd ?? 12);
  const grad = `linear-gradient(135deg, ${String(t.gradientPrimaryStart ?? primary)}, ${String(t.gradientPrimaryEnd ?? "#FFB400")})`;
  const font = String(t.font ?? "Inter") + ", system-ui, sans-serif";
  const sizeMd = Number(t.fontSizeMd ?? 16);
  const sizeLg = Number(t.fontSizeLg ?? 20);
  const sizeXs = Number(t.fontSizeXs ?? 12);
  const motion = `${Number(t.motionNormal ?? 250)}ms`;
  return (
    <div className="rounded-2xl p-5 border" style={{ background: surface, color: text, borderColor: `${text}20`, fontFamily: font, transition: `all ${motion}` }}>
      <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: muted }}>Canlı Önizleme ({mode})</div>
      <h3 className="font-bold mb-1" style={{ fontSize: sizeLg, color: text }}>Başlık (heading)</h3>
      <p className="mb-4" style={{ fontSize: sizeMd, color: muted }}>Gövde metni Lorem ipsum dolor sit amet.</p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button style={{ background: grad, color: "#fff", borderRadius: r, padding: "8px 14px", fontSize: sizeMd, fontWeight: 700, transition: `all ${motion}` }}>
          Primary
        </button>
        <button style={{ background: "transparent", color: primary, borderRadius: r, padding: "8px 14px", fontSize: sizeMd, fontWeight: 600, border: `2px solid ${primary}` }}>
          Secondary
        </button>
        <span style={{ background: `${primary}15`, color: primary, borderRadius: rSm, padding: "3px 8px", fontSize: sizeXs, fontWeight: 700 }}>✓ Doğrulanmış</span>
        <span style={{ background: `${text}10`, color: text, borderRadius: 999, padding: "3px 10px", fontSize: sizeXs }}>chip</span>
      </div>
      <div className="p-3 mb-2" style={{ background: `${primary}08`, border: `1px solid ${primary}30`, borderRadius: rMd }}>
        <div className="text-xs font-bold" style={{ color: primary }}>Glass card</div>
        <div className="text-[11px] mt-0.5" style={{ color: muted }}>Marka renginden türetilmiş kart yüzeyi</div>
      </div>
      <div className="p-3" style={{ background: surface, border: `1px solid ${text}15`, borderRadius: rMd, fontSize: sizeXs, color: muted }}>
        caption — küçük metin
      </div>
    </div>
  );
}

export default function ApkTasarimPage() {
  const [tokens, setTokens] = useState<AppConfigThemeTokens>(DEFAULT_TOKENS);
  const [branding, setBranding] = useState<AppConfigBranding>(DEFAULT_BRANDING);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [tab, setTab] = useState<ThemeTab>("colors");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data: AdminAppConfig = await api.getAdminAppConfig();
      const activeTheme = data.themes?.find((t) => t.isActive) ?? data.themes?.[0];
      if (activeTheme) {
        setActiveThemeId(activeTheme.id);
        setTokens({ ...DEFAULT_TOKENS, ...activeTheme.tokens });
      }
      if (data.branding) setBranding({ ...DEFAULT_BRANDING, ...data.branding });
    } catch { /* defaults */ }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const setToken = (k: keyof AppConfigThemeTokens, v: string | number) => setTokens((p) => ({ ...p, [k]: v }));
  const flash = (kind: "ok" | "err", text: string) => { setToast({ kind, text }); setTimeout(() => setToast(null), 2500); };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryBusy(true);
    try {
      const [themeRows, brandingRows] = await Promise.all([
        api.getAppConfigHistory("theme", activeThemeId ?? undefined, 20),
        api.getAppConfigHistory("branding", "default", 20),
      ]);
      setHistoryEntries([...themeRows, ...brandingRows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 30));
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Geçmiş alınamadı");
    } finally {
      setHistoryBusy(false);
    }
  };

  const doRollback = async (entry: HistoryEntry) => {
    if (!window.confirm("Bu sürüme geri dönülecek. Onaylıyor musunuz?")) return;
    try {
      await api.rollbackAppConfig(entry.id);
      flash("ok", "Geri alındı ✓");
      setHistoryOpen(false);
      await load();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Geri alma başarısız");
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
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

  // weight checkbox helpers
  const weightsStr = String(tokens.fontWeights ?? "400,500,600,700");
  const weightsArr = weightsStr.split(",").map((s) => Number(s.trim())).filter(Boolean);
  const toggleWeight = (w: number) => {
    const next = weightsArr.includes(w) ? weightsArr.filter((x) => x !== w) : [...weightsArr, w].sort((a, b) => a - b);
    setToken("fontWeights", next.join(","));
  };

  return (
    <div className="min-h-full -m-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🎨 APK Tasarım Studio</h1>
          <p className="text-sm text-slate-400 mt-1">Renkler, tipografi, motion ve marka — canlı önizleme ile.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void openHistory()}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 text-sm font-medium transition">
            🕐 Geçmiş
          </button>
          <button onClick={() => setPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition">
            📱 APK Önizleme
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium border ${toast.kind === "ok" ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200" : "bg-red-500/10 border-red-400/30 text-red-200"}`}>
          {toast.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Theme studio — 2 cols */}
        <div className="lg:col-span-2">
          <GlassCard title="Tema Studio" subtitle="Tüm token kategorileri tek panelde">
            {/* Tab bar */}
            <div className="flex gap-1 mb-4 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
              {([
                { k: "colors",     l: "🎨 Renkler" },
                { k: "typography", l: "🔤 Tipografi" },
                { k: "shape",      l: "📐 Şekil & Aralık" },
                { k: "motion",     l: "✨ Motion" },
                { k: "mode",       l: "🌓 Mode" },
              ] as { k: ThemeTab; l: string }[]).map(({ k, l }) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tab === k ? "bg-emerald-500 text-white shadow-md" : "text-slate-300 hover:text-white hover:bg-white/5"}`}>
                  {l}
                </button>
              ))}
            </div>

            {tab === "colors" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Primary" value={String(tokens.primary ?? "#FF5A1F")} onChange={(v) => setToken("primary", v)} />
                  <ColorField label="Surface" value={String(tokens.surface ?? "#FFFFFF")} onChange={(v) => setToken("surface", v)} />
                  <ColorField label="Text" value={String(tokens.text ?? "#1F2937")} onChange={(v) => setToken("text", v)} />
                  <ColorField label="Text Muted" value={String(tokens.textMuted ?? "#64748B")} onChange={(v) => setToken("textMuted", v)} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Gradient — Primary</div>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField label="Start" value={String(tokens.gradientPrimaryStart ?? "#FF5A1F")} onChange={(v) => setToken("gradientPrimaryStart", v)} />
                    <ColorField label="End" value={String(tokens.gradientPrimaryEnd ?? "#FFB400")} onChange={(v) => setToken("gradientPrimaryEnd", v)} />
                  </div>
                  <div className="h-10 mt-2 rounded-lg" style={{ background: `linear-gradient(135deg, ${String(tokens.gradientPrimaryStart ?? "#FF5A1F")}, ${String(tokens.gradientPrimaryEnd ?? "#FFB400")})` }} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Gradient — Hero</div>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField label="Start" value={String(tokens.gradientHeroStart ?? "#2D3E50")} onChange={(v) => setToken("gradientHeroStart", v)} />
                    <ColorField label="End" value={String(tokens.gradientHeroEnd ?? "#FF5A1F")} onChange={(v) => setToken("gradientHeroEnd", v)} />
                  </div>
                  <div className="h-10 mt-2 rounded-lg" style={{ background: `linear-gradient(135deg, ${String(tokens.gradientHeroStart ?? "#2D3E50")}, ${String(tokens.gradientHeroEnd ?? "#FF5A1F")})` }} />
                </div>
              </div>
            )}

            {tab === "typography" && (
              <div className="space-y-4">
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">Font Family</span>
                  <select value={String(tokens.font ?? "Inter")} onChange={(e) => setToken("font", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40 transition">
                    {FONT_OPTIONS.map((f) => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                  </select>
                </label>
                <div>
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">Font Weights</span>
                  <div className="flex flex-wrap gap-2">
                    {WEIGHT_OPTIONS.map((w) => (
                      <label key={w} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-200 cursor-pointer">
                        <input type="checkbox" checked={weightsArr.includes(w)} onChange={() => toggleWeight(w)} className="accent-emerald-400" />
                        {w}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Font Size Scale</span>
                  <div className="grid grid-cols-3 gap-3">
                    <NumField label="xs" value={Number(tokens.fontSizeXs ?? 12)} onChange={(v) => setToken("fontSizeXs", v)} min={8} max={24} suffix="px" />
                    <NumField label="sm" value={Number(tokens.fontSizeSm ?? 14)} onChange={(v) => setToken("fontSizeSm", v)} min={8} max={24} suffix="px" />
                    <NumField label="md" value={Number(tokens.fontSizeMd ?? 16)} onChange={(v) => setToken("fontSizeMd", v)} min={10} max={32} suffix="px" />
                    <NumField label="lg" value={Number(tokens.fontSizeLg ?? 20)} onChange={(v) => setToken("fontSizeLg", v)} min={12} max={40} suffix="px" />
                    <NumField label="xl" value={Number(tokens.fontSizeXl ?? 24)} onChange={(v) => setToken("fontSizeXl", v)} min={14} max={48} suffix="px" />
                    <NumField label="2xl" value={Number(tokens.fontSize2xl ?? 32)} onChange={(v) => setToken("fontSize2xl", v)} min={16} max={64} suffix="px" />
                  </div>
                </div>
                <NumField label="Letter Spacing" value={Number(tokens.letterSpacing ?? 0)} onChange={(v) => setToken("letterSpacing", v)} min={-2} max={10} suffix="px" />
              </div>
            )}

            {tab === "shape" && (
              <div className="space-y-4">
                <div>
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Border Radius Tokens</span>
                  <div className="grid grid-cols-4 gap-3">
                    <NumField label="small" value={Number(tokens.radiusSm ?? 8)} onChange={(v) => setToken("radiusSm", v)} min={0} max={32} suffix="px" />
                    <NumField label="medium" value={Number(tokens.radiusMd ?? 12)} onChange={(v) => setToken("radiusMd", v)} min={0} max={32} suffix="px" />
                    <NumField label="large" value={Number(tokens.radiusLg ?? 20)} onChange={(v) => setToken("radiusLg", v)} min={0} max={32} suffix="px" />
                    <NumField label="xl" value={Number(tokens.radiusXl ?? 28)} onChange={(v) => setToken("radiusXl", v)} min={0} max={48} suffix="px" />
                  </div>
                  <NumField label="Default Radius" value={Number(tokens.radius ?? 16)} onChange={(v) => setToken("radius", v)} min={0} max={48} suffix="px" />
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Spacing</span>
                  <div className="grid grid-cols-3 gap-3">
                    <NumField label="small" value={Number(tokens.spacingSm ?? 8)} onChange={(v) => setToken("spacingSm", v)} min={2} max={48} suffix="px" />
                    <NumField label="medium" value={Number(tokens.spacingMd ?? 12)} onChange={(v) => setToken("spacingMd", v)} min={2} max={48} suffix="px" />
                    <NumField label="large" value={Number(tokens.spacingLg ?? 20)} onChange={(v) => setToken("spacingLg", v)} min={2} max={64} suffix="px" />
                  </div>
                </div>
              </div>
            )}

            {tab === "motion" && (
              <div className="space-y-4">
                <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Duration</span>
                <div className="grid grid-cols-3 gap-3">
                  <NumField label="fast" value={Number(tokens.motionFast ?? 150)} onChange={(v) => setToken("motionFast", v)} min={0} max={1000} suffix="ms" />
                  <NumField label="normal" value={Number(tokens.motionNormal ?? 250)} onChange={(v) => setToken("motionNormal", v)} min={0} max={1500} suffix="ms" />
                  <NumField label="slow" value={Number(tokens.motionSlow ?? 400)} onChange={(v) => setToken("motionSlow", v)} min={0} max={2000} suffix="ms" />
                </div>
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">Curve</span>
                  <select value={String(tokens.motionCurve ?? "easeOut")} onChange={(e) => setToken("motionCurve", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40 transition">
                    {CURVE_OPTIONS.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                  </select>
                </label>
              </div>
            )}

            {tab === "mode" && (
              <div className="space-y-4">
                <div>
                  <span className="block text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Aktif Mode</span>
                  <div className="flex gap-2">
                    {(["light", "dark"] as const).map((m) => (
                      <button key={m} onClick={() => setToken("mode", m)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${String(tokens.mode ?? "light") === m ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-300 border border-white/10"}`}>
                        {m === "light" ? "☀️ Light" : "🌙 Dark"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Dark Mode Palette</div>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField label="Dark Primary" value={String(tokens.darkPrimary ?? "#FF7A3F")} onChange={(v) => setToken("darkPrimary", v)} />
                    <ColorField label="Dark Surface" value={String(tokens.darkSurface ?? "#0F172A")} onChange={(v) => setToken("darkSurface", v)} />
                    <ColorField label="Dark Text" value={String(tokens.darkText ?? "#F1F5F9")} onChange={(v) => setToken("darkText", v)} />
                    <ColorField label="Dark Text Muted" value={String(tokens.darkTextMuted ?? "#94A3B8")} onChange={(v) => setToken("darkTextMuted", v)} />
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Live preview row */}
          <div className="mt-5">
            <GlassCard title="Live Preview" subtitle="Tokens canlı yansıyor">
              <LivePreview t={tokens} />
            </GlassCard>
          </div>
        </div>

        {/* Branding */}
        <GlassCard title="Marka" subtitle="Logo, ikon, splash">
          <div className="space-y-3">
            <TextField label="Uygulama Adı" value={branding.appTitle ?? ""} onChange={(v) => setBranding((p) => ({ ...p, appTitle: v }))} placeholder="Yapgitsin" />
            <BrandingUploadField label="Logo URL" kind="logo" value={branding.logoUrl ?? ""} onChange={(v) => setBranding((p) => ({ ...p, logoUrl: v }))} placeholder="https://…/logo.png" onError={(m) => flash("err", m)} onSuccess={(m) => flash("ok", m)} />
            <BrandingUploadField label="Icon URL" kind="icon" value={branding.iconUrl ?? ""} onChange={(v) => setBranding((p) => ({ ...p, iconUrl: v }))} placeholder="https://…/icon.png" onError={(m) => flash("err", m)} onSuccess={(m) => flash("ok", m)} />
            <BrandingUploadField label="Splash URL" kind="splash" value={branding.splashUrl ?? ""} onChange={(v) => setBranding((p) => ({ ...p, splashUrl: v }))} placeholder="https://…/splash.png" onError={(m) => flash("err", m)} onSuccess={(m) => flash("ok", m)} />
            <div className="flex gap-2 pt-2">
              {[{ src: branding.logoUrl, lbl: "Logo" }, { src: branding.iconUrl, lbl: "Icon" }, { src: branding.splashUrl, lbl: "Splash" }].map((b) => (
                <div key={b.lbl} className="flex-1">
                  <div className="aspect-square rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {b.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.src} alt={b.lbl} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (<span className="text-[10px] text-slate-500">{b.lbl}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Footer save bar */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button onClick={() => void load()} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-medium transition">↺ Sıfırla</button>
        <button onClick={() => void saveAll()} disabled={saving} className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/30 transition disabled:opacity-50">
          {saving ? "Kaydediliyor…" : "💾 Kaydet"}
        </button>
      </div>

      {previewOpen && <ApkPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setHistoryOpen(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">🕐 Değişiklik Geçmişi</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tema ve marka için son 30 değişiklik</p>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="text-slate-400 hover:text-white text-xl leading-none px-2" aria-label="Kapat">×</button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {historyBusy ? (
                <div className="p-8 text-center text-sm text-slate-400">Yükleniyor…</div>
              ) : historyEntries.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">Geçmiş kaydı yok</div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {historyEntries.map((h) => {
                    const canRollback = !!(h.payload && (h.payload["before"] || h.payload["snapshot"]));
                    return (
                      <li key={h.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-mono text-emerald-300 truncate">{h.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(h.createdAt).toLocaleString("tr-TR")} · {h.actorEmail ?? h.adminUserId ?? "—"}
                          </p>
                        </div>
                        <button onClick={() => void doRollback(h)} disabled={!canRollback}
                          className="shrink-0 px-3 py-1.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition">
                          ↺ Geri Al
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
