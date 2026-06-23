"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Mode = "flat" | "percent";

/**
 * Phase 510 — Komisyon & Token Ekonomisi
 *
 * Backend (`/admin/settings/commission`) artık edit edilebilir token ekonomisi
 * alanlarını da döndürüyor. Bu ekran:
 *   • QR komisyon yüzdesini düzenler (Phase 254b)
 *   • Teklif kredi maliyetini düzenler: mode (flat|percent) + value + min + max
 *   • Live preview tablosu ile farklı bütçeler için cost'u sayfa-içi hesaplar.
 *
 * "usta" terminolojisi YASAK — UI metinleri "hizmet veren / teklif veren".
 */
export default function CommissionPage() {
  // ── State ─────────────────────────────────────────────────────────────
  const [commissionPctQr, setCommissionPctQr] = useState<number | null>(null);
  const [commissionDraft, setCommissionDraft] = useState<string>("");

  // Token economy live values + drafts
  const [mode, setMode] = useState<Mode>("percent");
  const [modeDraft, setModeDraft] = useState<Mode>("percent");
  const [value, setValue] = useState<number | null>(null);
  const [valueDraft, setValueDraft] = useState<string>("");
  const [minVal, setMinVal] = useState<number | null>(null);
  const [minDraft, setMinDraft] = useState<string>("");
  const [maxVal, setMaxVal] = useState<number | null>(null);
  const [maxDraft, setMaxDraft] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  // ── Load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    api
      .getCommissionSettings()
      .then((r) => {
        setCommissionPctQr(r.commissionPctQr);
        setCommissionDraft(String(r.commissionPctQr));
        setMode(r.offerTokenCostMode);
        setModeDraft(r.offerTokenCostMode);
        setValue(r.offerTokenCost);
        setValueDraft(String(r.offerTokenCost));
        setMinVal(r.offerTokenCostMin);
        setMinDraft(String(r.offerTokenCostMin));
        setMaxVal(r.offerTokenCostMax);
        setMaxDraft(String(r.offerTokenCostMax));
      })
      .catch((e: unknown) => {
        setMsg({
          kind: "err",
          text:
            "Ayarlar yüklenemedi: " +
            (e instanceof Error ? e.message : "bilinmiyor"),
        });
      });
  }, []);

  // ── Validation + dirty tracking ───────────────────────────────────────
  const commissionDirty =
    commissionPctQr !== null &&
    Number.isFinite(Number(commissionDraft)) &&
    Number(commissionDraft) !== commissionPctQr;
  const tokenDirty =
    mode !== modeDraft ||
    (value !== null && Number(valueDraft) !== value) ||
    (minVal !== null && Number(minDraft) !== minVal) ||
    (maxVal !== null && Number(maxDraft) !== maxVal);
  const dirty = commissionDirty || tokenDirty;

  // Draft preview (live) — kullanıcının yazdığı taslak değerlerle hesap.
  const draftValue = Number(valueDraft);
  const draftMin = Number(minDraft);
  const draftMax = Number(maxDraft);
  const validDraft =
    Number.isFinite(draftValue) &&
    Number.isFinite(draftMin) &&
    Number.isFinite(draftMax) &&
    draftMin >= 1 &&
    draftMax >= draftMin;

  const computePreview = (basis: number): { raw: number; cost: number } => {
    if (!validDraft) return { raw: 0, cost: 0 };
    const raw =
      modeDraft === "percent"
        ? basis > 0
          ? Math.ceil((basis * draftValue) / 100)
          : draftValue
        : draftValue;
    const cost = Math.max(draftMin, Math.min(draftMax, raw));
    return { raw, cost };
  };

  const previewRows = useMemo(
    () => [100, 500, 1_000, 5_000, 10_000, 50_000].map((b) => ({
      basis: b,
      ...computePreview(b),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modeDraft, valueDraft, minDraft, maxDraft],
  );

  // ── Save ──────────────────────────────────────────────────────────────
  const save = async () => {
    setMsg(null);
    // Commission validation
    const cParsed = Number(commissionDraft);
    if (!Number.isFinite(cParsed) || cParsed < 0 || cParsed > 100) {
      setMsg({ kind: "err", text: "Komisyon 0 ile 100 arasında olmalı" });
      return;
    }
    if (!validDraft || draftValue < 0 || draftValue > 10_000) {
      setMsg({ kind: "err", text: "Token alanları geçersiz (min ≥1, max ≥ min, value 0-10000)" });
      return;
    }
    setSaving(true);
    try {
      const payload: {
        commissionPctQr?: number;
        offerTokenCostMode?: Mode;
        offerTokenCost?: number;
        offerTokenCostMin?: number;
        offerTokenCostMax?: number;
      } = {};
      if (commissionDirty) payload.commissionPctQr = cParsed;
      if (mode !== modeDraft) payload.offerTokenCostMode = modeDraft;
      if (value !== null && Number(valueDraft) !== value)
        payload.offerTokenCost = draftValue;
      if (minVal !== null && Number(minDraft) !== minVal)
        payload.offerTokenCostMin = draftMin;
      if (maxVal !== null && Number(maxDraft) !== maxVal)
        payload.offerTokenCostMax = draftMax;

      const r = await api.updateCommissionSettings(payload);
      setCommissionPctQr(r.commissionPctQr);
      setCommissionDraft(String(r.commissionPctQr));
      setMode(r.offerTokenCostMode);
      setModeDraft(r.offerTokenCostMode);
      setValue(r.offerTokenCost);
      setValueDraft(String(r.offerTokenCost));
      setMinVal(r.offerTokenCostMin);
      setMinDraft(String(r.offerTokenCostMin));
      setMaxVal(r.offerTokenCostMax);
      setMaxDraft(String(r.offerTokenCostMax));
      setMsg({ kind: "ok", text: "Kaydedildi" });
      setTimeout(() => setMsg(null), 2500);
    } catch (e: unknown) {
      setMsg({
        kind: "err",
        text: "Hata: " + (e instanceof Error ? e.message : "bilinmiyor"),
      });
    } finally {
      setSaving(false);
    }
  };

  const loaded =
    commissionPctQr !== null && value !== null && minVal !== null && maxVal !== null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          💸 Komisyon &amp; Token Ekonomisi
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Platform komisyon oranı ve teklif başına kredi maliyeti yönetimi.
        </p>
      </div>

      {/* ── Komisyon (QR) ───────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Komisyon (QR)</h3>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          QR / escrow ödemelerinde brüt tutardan kesilen platform komisyon
          yüzdesi. Değişiklik yeni escrow release&apos;lerinde anında geçerli
          olur (60 sn cache).
        </p>
        <label className="block mt-5">
          <span className="text-xs font-medium text-gray-700">
            Platform komisyonu
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
              disabled={!loaded || saving}
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
      </section>

      {/* ── Teklif token maliyeti ──────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">
          Teklif token maliyeti
        </h3>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Teklif veren her kullanıcıdan teklif başına düşülecek kredi. Yüzde
          modunda ilan bütçesi baz alınır; her iki modda da{" "}
          <b>min</b>/<b>max</b> sınırları arasına kırpılır.
        </p>

        {/* Phase 521 — FLAT mode warning: bütçe-orantılı ekonomi devre dışı */}
        {mode === "flat" && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="font-semibold mb-1">
              ⚠ Şu an FLAT (sabit) mod aktif
            </div>
            <div className="leading-relaxed">
              Bütçe-orantılı (%) ekonomisi devre dışı. Min/max sınırları yine
              uygulanır ama tüm tekliflerde aynı sabit kredi düşülür. Önerilen
              mod: <b>Bütçenin yüzdesi (percent)</b> — küçük bütçelerde min,
              büyük bütçelerde max bound ile koruma sağlar. Phase 510 ile gelen
              hint ve preview ekonomisi bu modda çalışır.
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mode */}
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Mod</span>
            <select
              value={modeDraft}
              onChange={(e) => setModeDraft(e.target.value as Mode)}
              disabled={!loaded || saving}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="flat">Sabit (flat)</option>
              <option value="percent">Bütçenin yüzdesi (percent)</option>
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              {modeDraft === "percent"
                ? "cost = ceil(bütçe × value/100), sonra [min..max] arası kırpılır"
                : "cost = value, sonra [min..max] arası kırpılır"}
            </p>
          </label>

          {/* Value */}
          <label className="block">
            <span className="text-xs font-medium text-gray-700">
              Değer ({modeDraft === "percent" ? "%" : "kredi"})
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={10000}
                value={valueDraft}
                onChange={(e) => setValueDraft(e.target.value)}
                disabled={!loaded || saving}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <span className="text-sm text-gray-500">
                {modeDraft === "percent" ? "%" : "kredi"}
              </span>
            </div>
            {value !== null && (
              <p className="text-[11px] text-gray-400 mt-1">
                Mevcut: <b>{value}</b>
              </p>
            )}
          </label>

          {/* Min */}
          <label className="block">
            <span className="text-xs font-medium text-gray-700">
              Min (kredi)
            </span>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min={1}
              max={10000}
              value={minDraft}
              onChange={(e) => setMinDraft(e.target.value)}
              disabled={!loaded || saving}
              className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {minVal !== null && (
              <p className="text-[11px] text-gray-400 mt-1">
                Mevcut: <b>{minVal}</b>
              </p>
            )}
          </label>

          {/* Max */}
          <label className="block">
            <span className="text-xs font-medium text-gray-700">
              Max (kredi)
            </span>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min={1}
              max={10000}
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
              disabled={!loaded || saving}
              className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {maxVal !== null && (
              <p className="text-[11px] text-gray-400 mt-1">
                Mevcut: <b>{maxVal}</b>
              </p>
            )}
          </label>
        </div>

        {/* Live preview tablosu */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            🔍 Canlı önizleme
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            Taslak değerlerinizle farklı ilan bütçeleri için teklif başına
            düşecek kredi miktarı. (Kaydedilmeden gösterilir.)
          </p>
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2">İlan bütçesi (₺)</th>
                  <th className="text-left px-3 py-2">Ham hesap</th>
                  <th className="text-left px-3 py-2">
                    Sonuç (kredi)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map((r) => (
                  <tr key={r.basis} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700">
                      {r.basis.toLocaleString("tr-TR")} ₺
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {validDraft ? `${r.raw} kredi` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-800 font-semibold">
                        🪙 {validDraft ? r.cost : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!validDraft && (
            <p className="text-[11px] text-rose-600 mt-2">
              Önizleme için: min ≥ 1, max ≥ min ve value geçerli bir sayı olmalı.
            </p>
          )}
        </div>
      </section>

      {/* ── Save bar ───────────────────────────────────────────────────── */}
      <div className="sticky bottom-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!loaded || saving || !dirty}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {saving ? "Kaydediliyor…" : "Tümünü Kaydet"}
        </button>
        {dirty && (
          <span className="text-xs text-amber-600">
            Kaydedilmemiş değişiklik var
          </span>
        )}
        {msg && (
          <span
            className={`text-xs rounded px-3 py-1.5 border ${
              msg.kind === "ok"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}
