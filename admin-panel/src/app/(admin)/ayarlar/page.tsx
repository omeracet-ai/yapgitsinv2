"use client";

import { useEffect, useState } from "react";
import { api, CONTACT_BLOCK_KEY } from "@/lib/api";

export default function SettingsPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getSetting(CONTACT_BLOCK_KEY)
      .then((r) => setEnabled((r.value || "true") === "true"))
      .catch(() => setEnabled(true));
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h2>
        <p className="text-sm text-gray-500 mt-1">
          Platform genelinde geçerli olan operasyonel toggle&apos;lar.
        </p>
      </div>

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
