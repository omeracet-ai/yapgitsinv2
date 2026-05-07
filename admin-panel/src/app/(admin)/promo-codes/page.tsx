"use client";

import { useEffect, useState } from "react";
import { api, type PromoCode } from "@/lib/api";

type FormState = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  maxRedemptions: number | null;
  minSpend: number | null;
  validFrom: string | null;
  validUntil: string | null;
  description: string | null;
  appliesTo: "tokens" | "offer" | "all";
  isActive: boolean;
};

const EMPTY: FormState = {
  code: "",
  discountType: "percent",
  discountValue: 10,
  maxRedemptions: null,
  minSpend: null,
  validFrom: null,
  validUntil: null,
  description: "",
  appliesTo: "all",
  isActive: true,
};

function toDateInput(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function PromoCodesPage() {
  const [items, setItems] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setItems(await api.promoCodes());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setModal(true); };
  const closeModal = () => setModal(false);

  const handleSave = async () => {
    if (!form.code.trim()) return;
    setSaving(true);
    try {
      await api.createPromoCode({
        ...form,
        code: form.code.trim().toUpperCase(),
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        description: form.description || null,
      });
      await load();
      closeModal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: PromoCode) => {
    setBusyId(p.id);
    try {
      await api.updatePromoCode(p.id, { isActive: !p.isActive });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu promo kodu silmek istediğinize emin misiniz?")) return;
    setBusyId(id);
    try {
      await api.deletePromoCode(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Promo Kodlar</h2>
        <button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + Yeni Kod
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-sm">Henüz promo kod yok.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kod</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">İndirim</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kullanım</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Bitiş</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Durum</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{p.code}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {p.discountType === "percent" ? `%${p.discountValue}` : `${p.discountValue}₺`}
                    <span className="ml-2 text-xs text-gray-400">({p.appliesTo})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.redeemedCount}{p.maxRedemptions !== null ? ` / ${p.maxRedemptions}` : " / ∞"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.validUntil ? new Date(p.validUntil).toLocaleDateString("tr-TR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(p)} disabled={busyId === p.id}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${p.isActive ? "bg-green-500" : "bg-gray-300"} disabled:opacity-50`}>
                      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${p.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(p.id)} disabled={busyId === p.id}
                      className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50">
                      {busyId === p.id ? "…" : "Sil"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold mb-4">Yeni Promo Kod</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kod *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="w-full uppercase border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="WELCOME10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tip</label>
                  <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as FormState["discountType"] }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="percent">Yüzde (%)</option>
                    <option value="fixed">Sabit (₺)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Değer *</label>
                  <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Kullanım</label>
                  <input type="number" value={form.maxRedemptions ?? ""} onChange={e => setForm(f => ({ ...f, maxRedemptions: e.target.value === "" ? null : Number(e.target.value) }))}
                    placeholder="sınırsız"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min Harcama</label>
                  <input type="number" value={form.minSpend ?? ""} onChange={e => setForm(f => ({ ...f, minSpend: e.target.value === "" ? null : Number(e.target.value) }))}
                    placeholder="—"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Başlangıç</label>
                  <input type="date" value={toDateInput(form.validFrom)} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value || null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bitiş</label>
                  <input type="date" value={toDateInput(form.validUntil)} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value || null }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Uygulanır</label>
                <select value={form.appliesTo} onChange={e => setForm(f => ({ ...f, appliesTo: e.target.value as FormState["appliesTo"] }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">Tümü</option>
                  <option value="tokens">Token alımı</option>
                  <option value="offer">Teklif</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
                <textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Aktif</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.isActive ? "bg-green-500" : "bg-gray-300"}`}>
                  <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">İptal</button>
              <button onClick={handleSave} disabled={saving || !form.code.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
