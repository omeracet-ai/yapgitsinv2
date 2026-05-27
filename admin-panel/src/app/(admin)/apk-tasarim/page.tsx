"use client";

/**
 * /apk-tasarim — Theme tokens + branding studio for the mobile app.
 * Three glass cards: theme tokens, branding, save/preview actions.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { api, type AdminAppConfig, type AppConfigBranding, type AppConfigThemeTokens } from "@/lib/api";

// M7 perf — Preview modal pulls a sizeable PhoneFrame3D tree; load only on open.
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

function BrandingUploadField({
  label,
  kind,
  value,
  onChange,
  placeholder,
  onError,
  onSuccess,
}: {
  label: string;
  kind: "logo" | "icon" | "splash";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("Sadece resim dosyası yükleyin");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Dosya 5MB'dan büyük olamaz");
      return;
    }
    setBusy(true);
    try {
      const { api } = await import("@/lib/api");
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
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-400/40 transition"
        />
        <button
          type="button"
          onClick={handlePick}
          disabled={busy}
          className="shrink-0 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-50 transition"
          title={`${label} yükle`}
        >
          {busy ? "…" : "📤"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
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

  // Combined history for theme + branding — newest first.
  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryBusy(true);
    try {
      const [themeRows, brandingRows] = await Promise.all([
        api.getAppConfigHistory("theme", activeThemeId ?? undefined, 20),
        api.getAppConfigHistory("branding", "default", 20),
      ]);
      const merged = [...themeRows, ...brandingRows]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 30);
      setHistoryEntries(merged);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => void openHistory()}
            className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 text-sm font-medium transition"
          >
            🕐 Geçmiş
          </button>
          <button
            onClick={() => setPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition"
          >
            📱 APK Önizleme
          </button>
        </div>
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
            <BrandingUploadField
              label="Logo URL"
              kind="logo"
              value={branding.logoUrl ?? ""}
              onChange={(v) => setBranding((p) => ({ ...p, logoUrl: v }))}
              placeholder="https://…/logo.png"
              onError={(m) => flash("err", m)}
              onSuccess={(m) => flash("ok", m)}
            />
            <BrandingUploadField
              label="Icon URL"
              kind="icon"
              value={branding.iconUrl ?? ""}
              onChange={(v) => setBranding((p) => ({ ...p, iconUrl: v }))}
              placeholder="https://…/icon.png"
              onError={(m) => flash("err", m)}
              onSuccess={(m) => flash("ok", m)}
            />
            <BrandingUploadField
              label="Splash URL"
              kind="splash"
              value={branding.splashUrl ?? ""}
              onChange={(v) => setBranding((p) => ({ ...p, splashUrl: v }))}
              placeholder="https://…/splash.png"
              onError={(m) => flash("err", m)}
              onSuccess={(m) => flash("ok", m)}
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
                      <img src={b.src} alt={b.lbl} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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

      {previewOpen && (
        <ApkPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
      )}

      {/* History modal — last 30 theme+branding audit entries with rollback */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">🕐 Değişiklik Geçmişi</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tema ve marka için son 30 değişiklik</p>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="text-slate-400 hover:text-white text-xl leading-none px-2"
                aria-label="Kapat"
              >
                ×
              </button>
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
                            {new Date(h.createdAt).toLocaleString("tr-TR")} ·{" "}
                            {h.actorEmail ?? h.adminUserId ?? "—"}
                          </p>
                        </div>
                        <button
                          onClick={() => void doRollback(h)}
                          disabled={!canRollback}
                          className="shrink-0 px-3 py-1.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          title={canRollback ? "Bu sürüme geri dön" : "Snapshot yok — geri alınamaz"}
                        >
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
