"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function CommissionPage() {
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
        <h2 className="text-2xl font-bold text-gray-900">Komisyon Yönetimi</h2>
        <p className="text-sm text-gray-500 mt-1">
          Platform komisyon oranı ve token ekonomisi parametreleri.
        </p>
      </div>

      {/* ── Phase 254b — Komisyon & Token Ekonomisi ───────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">💸</span>
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
    </div>
  );
}
