"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Cert = Awaited<ReturnType<typeof api.pendingCertifications>>[number];

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("tr-TR"); } catch { return s; }
}

export default function CertificationsPage() {
  const [items, setItems] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.pendingCertifications();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, action: 'verify' | 'reject') => {
    setBusyId(id);
    try {
      const note = notes[id]?.trim() || undefined;
      if (action === 'verify') {
        await api.verifyCertification(id, note);
      } else {
        await api.rejectCertification(id, note);
      }
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📜 Sertifika Doğrulama Kuyruğu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bekleyen sertifika başvurularını inceleyin ve onaylayın.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Yenile
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">✅</div>
          <div>Bekleyen sertifika yok.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📜</span>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {c.name}
                    </h3>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Veren Kurum: <span className="font-medium">{c.issuer}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Veriliş: {fmtDate(c.issuedAt)}
                    {c.expiresAt ? ` · Geçerlilik: ${fmtDate(c.expiresAt)}` : " · Süresiz"}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    User: <span className="font-mono">{c.userId}</span> · Yüklenme: {fmtDate(c.createdAt)}
                  </div>
                </div>
                {c.documentUrl ? (
                  <a
                    href={c.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                  >
                    📎 Dokümanı Aç
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-gray-400">Doküman yok</span>
                )}
              </div>

              <textarea
                value={notes[c.id] ?? ""}
                onChange={(e) =>
                  setNotes((p) => ({ ...p, [c.id]: e.target.value }))
                }
                placeholder="Yönetici notu (opsiyonel)…"
                className="mt-3 w-full text-sm border border-gray-200 rounded-md p-2 resize-none"
                rows={2}
              />

              <div className="mt-3 flex gap-2 justify-end">
                <button
                  onClick={() => void decide(c.id, 'reject')}
                  disabled={busyId === c.id}
                  className="px-4 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
                >
                  Reddet
                </button>
                <button
                  onClick={() => void decide(c.id, 'verify')}
                  disabled={busyId === c.id}
                  className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busyId === c.id ? "İşleniyor…" : "Onayla"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
