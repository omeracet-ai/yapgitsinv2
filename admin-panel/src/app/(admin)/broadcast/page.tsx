"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type Segment = "all" | "workers" | "customers" | "verified_workers";

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "workers", label: "Ustalar" },
  { value: "customers", label: "Müşteriler" },
  { value: "verified_workers", label: "Doğrulanmış Ustalar" },
];

const TITLE_MAX = 100;
const MSG_MAX = 500;

export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const segmentLabel = SEGMENTS.find((s) => s.value === segment)?.label ?? segment;
  const canSubmit = title.trim().length > 0 && message.trim().length > 0 && !loading;

  async function handleSend() {
    if (!canSubmit) return;
    if (!window.confirm(`Bu duyuru "${segmentLabel}" segmentine gidecek, emin misin?`)) return;
    setLoading(true);
    setToast(null);
    try {
      const res = await api.broadcastNotification({ title: title.trim(), message: message.trim(), segment });
      setToast({ kind: "success", text: `${res.sent} kişiye gönderildi` });
      setTitle("");
      setMessage("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setToast({ kind: "error", text: `Hata: ${msg}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Duyuru Gönder</h2>
      <p className="text-sm text-gray-500 mb-6">
        Seçilen segmentteki tüm kullanıcılara push bildirim gönder.
      </p>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 space-y-5">
        {/* Başlık */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700">Başlık</label>
            <span className={`text-xs ${title.length >= TITLE_MAX ? "text-red-500" : "text-gray-400"}`}>
              {title.length}/{TITLE_MAX}
            </span>
          </div>
          <input
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Yeni özellik yayında!"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        {/* Mesaj */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700">Mesaj</label>
            <span className={`text-xs ${message.length >= MSG_MAX ? "text-red-500" : "text-gray-400"}`}>
              {message.length}/{MSG_MAX}
            </span>
          </div>
          <textarea
            value={message}
            maxLength={MSG_MAX}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Duyuru mesajı..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            disabled={loading}
          />
        </div>

        {/* Segment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Segment</label>
          <div className="grid grid-cols-2 gap-2">
            {SEGMENTS.map((s) => {
              const active = segment === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSegment(s.value)}
                  disabled={loading}
                  className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors text-left ${
                    active
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle border-2 border-current">
                    {active && <span className="block w-full h-full rounded-full bg-current scale-50" />}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              toast.kind === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Action */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}
