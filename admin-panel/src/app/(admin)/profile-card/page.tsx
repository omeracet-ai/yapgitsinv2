"use client";

/**
 * /profile-card — Profile card visibility & labels admin control.
 *
 * Backend: re-uses `app_layouts` entity with `screen='profile_card'`.
 * Each layout item: { key, visible, props: { label?: string } }.
 *
 * Flutter side reads via app_config_visibility.isProfileFieldVisible(key)
 * and shows/hides the field accordingly. Label override is optional —
 * Flutter falls back to its default Turkish label.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type AppConfigLayoutItem } from "@/lib/api";

interface FieldDef {
  key: string;
  defaultLabel: string;
  hint: string;
}

const SCREEN = "profile_card";

const FIELDS: FieldDef[] = [
  { key: "averageRating", defaultLabel: "Ortalama Puan", hint: "5 üzerinden yıldız" },
  { key: "reviewsCount", defaultLabel: "Yorum Sayısı", hint: "totalReviews" },
  { key: "jobsCount", defaultLabel: "İş Sayısı", hint: "asWorkerTotal veya asCustomerTotal" },
  { key: "completionRate", defaultLabel: "Tamamlama Oranı", hint: "% başarı" },
  { key: "reputationScore", defaultLabel: "İtibar Puanı", hint: "reputationScore" },
  { key: "badges", defaultLabel: "Rozetler", hint: "Otomatik + manuel rozetler" },
  { key: "verifiedBadge", defaultLabel: "Doğrulanmış Rozeti", hint: "identityVerified" },
  { key: "premiumLabel", defaultLabel: "Premium Etiketi", hint: "Premium üyelik" },
  { key: "workerSkills", defaultLabel: "Yetenekler", hint: "workerSkills tag listesi" },
  { key: "portfolioPhotos", defaultLabel: "Portfolyo Fotoğrafları", hint: "Geçmiş işler / portfolyo" },
];

type FieldState = Record<string, { visible: boolean; label: string }>;

function GlassCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function defaultState(): FieldState {
  const out: FieldState = {};
  for (const f of FIELDS) {
    out[f.key] = { visible: true, label: "" };
  }
  return out;
}

export default function ProfileCardPage() {
  const [state, setState] = useState<FieldState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ k: "ok" | "err"; t: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await api.getAdminAppConfig();
      const screen = cfg.layouts.find((l) => l.screen === SCREEN);
      const next = defaultState();
      if (screen) {
        for (const it of screen.items) {
          if (!(it.key in next)) continue; // ignore unknown keys
          const label =
            it.props && typeof it.props.label === "string"
              ? (it.props.label as string)
              : "";
          next[it.key] = { visible: it.visible !== false, label };
        }
      }
      setState(next);
    } catch (e) {
      setFlash({ k: "err", t: e instanceof Error ? e.message : "Hata" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    try {
      setSaving(true);
      const items: AppConfigLayoutItem[] = FIELDS.map((f) => {
        const s = state[f.key];
        const props: Record<string, unknown> = {};
        if (s.label.trim()) props.label = s.label.trim();
        return {
          key: f.key,
          visible: s.visible,
          props,
        };
      });
      await api.putLayout(SCREEN, items);
      setFlash({ k: "ok", t: "Profil kartı ayarları kaydedildi" });
    } catch (e) {
      setFlash({ k: "err", t: e instanceof Error ? e.message : "Hata" });
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = (visible: boolean) => {
    setState((p) => {
      const next: FieldState = {};
      for (const k of Object.keys(p)) next[k] = { ...p[k], visible };
      return next;
    });
  };

  // ── Preview ── reflects current toggle/label config.
  const preview = useMemo(() => {
    const labelFor = (key: string) => {
      const f = FIELDS.find((x) => x.key === key)!;
      return state[key]?.label.trim() || f.defaultLabel;
    };
    const on = (key: string) => state[key]?.visible !== false;
    return { labelFor, on };
  }, [state]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: 2 cols — config */}
      <div className="lg:col-span-2 space-y-4">
        {flash && (
          <div
            className={`rounded-lg px-4 py-2 text-sm ${
              flash.k === "ok"
                ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                : "bg-red-500/15 text-red-200 border border-red-500/30"
            }`}
          >
            {flash.t}
          </div>
        )}

        <GlassCard
          title="👤 Profil Kartı Alanları"
          subtitle="Mobil uygulamada (PublicProfileScreen) hangi alanların gösterileceğini ve etiketleri buradan kontrol et."
          actions={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleAll(true)}
                className="rounded-md bg-white/5 hover:bg-white/10 text-white text-xs font-medium px-3 py-1.5 transition-colors"
              >
                Tümünü Aç
              </button>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                className="rounded-md bg-white/5 hover:bg-white/10 text-white text-xs font-medium px-3 py-1.5 transition-colors"
              >
                Tümünü Kapat
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || loading}
                className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 transition-colors"
              >
                {saving ? "Kaydediliyor…" : "💾 Kaydet"}
              </button>
            </div>
          }
        >
          {loading ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              Yükleniyor…
            </div>
          ) : (
            <div className="space-y-2">
              {FIELDS.map((f) => {
                const s = state[f.key];
                return (
                  <div
                    key={f.key}
                    className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5"
                  >
                    {/* Toggle */}
                    <label className="inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={s.visible}
                        onChange={(e) =>
                          setState((p) => ({
                            ...p,
                            [f.key]: { ...p[f.key], visible: e.target.checked },
                          }))
                        }
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-checked:bg-emerald-500 rounded-full relative transition-colors">
                        <div
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            s.visible ? "translate-x-4" : ""
                          }`}
                        />
                      </div>
                    </label>

                    {/* Field name + hint */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {f.defaultLabel}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {f.key} · {f.hint}
                      </div>
                    </div>

                    {/* Label override */}
                    <input
                      type="text"
                      placeholder="(varsayılan)"
                      value={s.label}
                      onChange={(e) =>
                        setState((p) => ({
                          ...p,
                          [f.key]: { ...p[f.key], label: e.target.value },
                        }))
                      }
                      className="w-48 bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/50"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Right: preview */}
      <div className="space-y-4">
        <GlassCard
          title="Önizleme"
          subtitle="Mobil profil kartı yaklaşık görünümü"
        >
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                EK
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="text-sm font-bold text-white truncate">
                    Emre Kaya
                  </div>
                  {preview.on("verifiedBadge") && (
                    <span
                      title={preview.labelFor("verifiedBadge")}
                      className="text-blue-400 text-xs"
                    >
                      ✓
                    </span>
                  )}
                  {preview.on("premiumLabel") && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5">
                      {preview.labelFor("premiumLabel")}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Elektrikçi · İstanbul
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {preview.on("averageRating") && (
                <div className="bg-white/5 rounded-lg py-2">
                  <div className="text-sm font-bold text-amber-400">★ 4.8</div>
                  <div className="text-[10px] text-slate-400">
                    {preview.labelFor("averageRating")}
                  </div>
                </div>
              )}
              {preview.on("reviewsCount") && (
                <div className="bg-white/5 rounded-lg py-2">
                  <div className="text-sm font-bold text-white">42</div>
                  <div className="text-[10px] text-slate-400">
                    {preview.labelFor("reviewsCount")}
                  </div>
                </div>
              )}
              {preview.on("jobsCount") && (
                <div className="bg-white/5 rounded-lg py-2">
                  <div className="text-sm font-bold text-white">128</div>
                  <div className="text-[10px] text-slate-400">
                    {preview.labelFor("jobsCount")}
                  </div>
                </div>
              )}
              {preview.on("completionRate") && (
                <div className="bg-white/5 rounded-lg py-2">
                  <div className="text-sm font-bold text-emerald-400">%96</div>
                  <div className="text-[10px] text-slate-400">
                    {preview.labelFor("completionRate")}
                  </div>
                </div>
              )}
              {preview.on("reputationScore") && (
                <div className="bg-white/5 rounded-lg py-2">
                  <div className="text-sm font-bold text-orange-400">110</div>
                  <div className="text-[10px] text-slate-400">
                    {preview.labelFor("reputationScore")}
                  </div>
                </div>
              )}
            </div>

            {preview.on("badges") && (
              <div>
                <div className="text-[10px] text-slate-400 mb-1">
                  {preview.labelFor("badges")}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    Top Rated
                  </span>
                  <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-full px-2 py-0.5">
                    Responsive
                  </span>
                </div>
              </div>
            )}

            {preview.on("workerSkills") && (
              <div>
                <div className="text-[10px] text-slate-400 mb-1">
                  {preview.labelFor("workerSkills")}
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 rounded-full px-2 py-0.5">
                    Tesisat
                  </span>
                  <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 rounded-full px-2 py-0.5">
                    Kaynak
                  </span>
                </div>
              </div>
            )}

            {preview.on("portfolioPhotos") && (
              <div>
                <div className="text-[10px] text-slate-400 mb-1">
                  {preview.labelFor("portfolioPhotos")}
                </div>
                <div className="flex gap-1">
                  <div className="w-12 h-12 bg-slate-700 rounded" />
                  <div className="w-12 h-12 bg-slate-700 rounded" />
                  <div className="w-12 h-12 bg-slate-700 rounded" />
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
