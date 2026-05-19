"use client";

import { useEffect, useState } from "react";
import { api, CONTACT_BLOCK_KEY } from "@/lib/api";

export default function SettingsPage() {
  // Contact-sharing toggle (existing)
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Phase 254b — Platform commission + token economy
  const [commissionPctQr, setCommissionPctQr] = useState<number | null>(null);
  const [commissionDraft, setCommissionDraft] = useState<string>("");
  const [offerTokenCost, setOfferTokenCost] = useState<number | null>(null);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionMsg, setCommissionMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    api
      .getSetting(CONTACT_BLOCK_KEY)
      .then((r) => setEnabled((r.value || "true") === "true"))
      .catch(() => setEnabled(true));

    api
      .getCommissionSettings()
      .then((r) => {
        setCommissionPctQr(r.commissionPctQr);
        setCommissionDraft(String(r.commissionPctQr));
        setOfferTokenCost(r.offerTokenCost);
      })
      .catch((e: unknown) => {
        setCommissionMsg({
          kind: "err",
          text:
            "Komisyon ayarı yüklenemedi: " +
            (e instanceof Error ? e.message : "bilinmiyor"),
        });
      });
  }, []);

  const toggle = async () => {
    if (enabled === null || saving) return;
    const next = !enabled;
    setSaving(true);
    setMsg(null);
    try {
      await api.updateSetting(CONTACT_BLOCK_KEY, next ? "true" : "false");
      setEnabled(next);
      setMsg(next ? "Aktif edildi" : "Pasif edildi");
      setTimeout(() => setMsg(null), 2500);
    } catch (e: unknown) {
      setMsg("Hata: " + (e instanceof Error ? e.message : "bilinmiyor"));
    } finally {
      setSaving(false);
    }
  };

  const saveCommission = async () => {
    const parsed = Number(commissionDraft);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setCommissionMsg({
        kind: "err",
        text: "Komisyon 0 ile 100 arasında bir sayı olmalı",
      });
      return;
    }
    setCommissionSaving(true);
    setCommissionMsg(null);
    try {
      const r = await api.updateCommissionSettings(parsed);
      setCommissionPctQr(r.commissionPctQr);
      setCommissionDraft(String(r.commissionPctQr));
      setCommissionMsg({ kind: "ok", text: "Kaydedildi" });
      setTimeout(() => setCommissionMsg(null), 2500);
    } catch (e: unknown) {
      setCommissionMsg({
        kind: "err",
        text: "Hata: " + (e instanceof Error ? e.message : "bilinmiyor"),
      });
    } finally {
      setCommissionSaving(false);
    }
  };

  const commissionDirty =
    commissionPctQr !== null &&
    Number.isFinite(Number(commissionDraft)) &&
    Number(commissionDraft) !== commissionPctQr;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Platform Ayarları</h2>
        <p className="text-sm text-gray-500 mt-1">
          Platform genelinde geçerli olan operasyonel toggle&apos;lar ve
          ekonomi parametreleri.
        </p>
      </div>

      {/* ── Phase 254b — Komisyon & Token Ekonomisi ───────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <h3 className="text-base font-semibold text-gray-900">
            Komisyon &amp; Token Ekonomisi
          </h3>
        </div>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          QR / escrow ödemelerinde brüt tutardan kesilen platform komisyon
          yüzdesi. Değişiklik yeni escrow release&apos;lerinde anında geçerli
          olur (60 sn cache).
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Commission input */}
          <label className="block">
            <span className="text-xs font-medium text-gray-700">
              Platform komisyonu (QR)
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={100}
                value={commissionDraft}
                onChange={(e) => setCommissionDraft(e.target.value)}
                disabled={commissionPctQr === null || commissionSaving}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            {commissionPctQr !== null && (
              <p className="text-[11px] text-gray-400 mt-1">
                Mevcut değer: <b>{commissionPctQr}%</b>
              </p>
            )}
          </label>

          {/* Offer token cost (readonly) */}
          <div className="block">
            <span className="text-xs font-medium text-gray-700">
              Teklif başına token bedeli
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm font-semibold text-amber-800">
                🪙{" "}
                {offerTokenCost !== null ? `${offerTokenCost} token` : "— —"}
              </span>
              <span className="text-[11px] text-gray-400">
                env / sabit (OFFER_TOKEN_COST)
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Salt-okunur. Değiştirmek için backend env güncellenmeli.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={saveCommission}
            disabled={
              commissionPctQr === null || commissionSaving || !commissionDirty
            }
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {commissionSaving ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {commissionMsg && (
            <span
              className={`text-xs rounded px-3 py-1.5 border ${
                commissionMsg.kind === "ok"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {commissionMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* ── Mevcut: Sistem İçi İletişim Zorunluluğu ──────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <h3 className="text-base font-semibold text-gray-900">
                Sistem İçi İletişim Zorunluluğu
              </h3>
              {enabled !== null && (
                <span
                  className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                    enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {enabled ? "Aktif" : "Pasif"}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Aktif olduğunda kullanıcılar chat&apos;te telefon numarası, e-posta
              veya WhatsApp / Telegram / Instagram linklerini paylaşamaz. Bu
              içerikler otomatik olarak maskelenir ve gönderene uyarı iletilir.
              Komisyon kaçışını engellemek için tasarlanmıştır.
            </p>
          </div>

          <button
            type="button"
            onClick={toggle}
            disabled={enabled === null || saving}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              enabled ? "bg-emerald-500" : "bg-gray-300"
            } ${saving ? "opacity-50" : "cursor-pointer"}`}
            aria-pressed={!!enabled}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {msg && (
          <div className="mt-4 text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
