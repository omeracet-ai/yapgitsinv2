"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Deposit = Awaited<ReturnType<typeof api.cryptoDeposits>>[number];

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("tr-TR");
  } catch {
    return s;
  }
}

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "pending", label: "Onay Bekleyen" },
  { key: "approved", label: "Onaylanan" },
  { key: "rejected", label: "Reddedilen" },
  { key: "", label: "Tümü" },
];

export default function CryptoDepositsPage() {
  const [items, setItems] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [credits, setCredits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.cryptoDeposits(status || undefined);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (d: Deposit, action: "approve" | "reject") => {
    setBusyId(d.id);
    setError(null);
    try {
      const note = notes[d.id]?.trim() || undefined;
      if (action === "approve") {
        const override = credits[d.id]?.trim();
        const credit = override ? Number(override) : undefined;
        await api.approveCryptoDeposit(d.id, note, credit);
      } else {
        await api.rejectCryptoDeposit(d.id, note);
      }
      setItems((prev) => prev.filter((x) => x.id !== d.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const badge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700",
      approved: "bg-emerald-50 text-emerald-700",
      rejected: "bg-red-50 text-red-700",
    };
    const label =
      s === "approved" ? "Onaylandı" : s === "rejected" ? "Reddedildi" : "Bekliyor";
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[s] ?? ""}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">₿ USDT Yatırım Talepleri</h1>
          <p className="text-sm text-gray-500 mt-1">
            USDT-TRC20 yatırımlarını TronScan&apos;de doğrulayıp onaylayın → Kredi yüklenir.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Yenile
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`px-3 py-1.5 text-sm rounded-md border ${
              status === t.key
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-500">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-3">💸</div>
          <div>Kayıt yok.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((d) => (
            <div
              key={d.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {d.amountUsdt} {d.asset} → {d.creditAmount} Kredi
                    </span>
                    {badge(d.status)}
                    <span className="text-xs text-gray-400">
                      {d.purpose === "wallet" ? "Cüzdan" : "Jeton"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 break-all">
                    TxID: <span className="font-mono">{d.txId}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    User: <span className="font-mono">{d.userId}</span> ·{" "}
                    {fmtDate(d.createdAt)}
                  </div>
                  {d.adminNote && (
                    <div className="mt-1 text-xs text-gray-600">Not: {d.adminNote}</div>
                  )}
                </div>
                <a
                  href={`https://tronscan.org/#/transaction/${d.txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                >
                  🔍 TronScan&apos;de Doğrula
                </a>
              </div>

              {d.status === "pending" && (
                <>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      value={credits[d.id] ?? ""}
                      onChange={(e) =>
                        setCredits((p) => ({ ...p, [d.id]: e.target.value }))
                      }
                      placeholder={`Kredi (varsayılan ${d.creditAmount})`}
                      className="sm:w-56 text-sm border border-gray-200 rounded-md p-2"
                    />
                    <input
                      value={notes[d.id] ?? ""}
                      onChange={(e) =>
                        setNotes((p) => ({ ...p, [d.id]: e.target.value }))
                      }
                      placeholder="Yönetici notu (opsiyonel)…"
                      className="flex-1 text-sm border border-gray-200 rounded-md p-2"
                    />
                  </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      onClick={() => void decide(d, "reject")}
                      disabled={busyId === d.id}
                      className="px-4 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
                    >
                      Reddet
                    </button>
                    <button
                      onClick={() => void decide(d, "approve")}
                      disabled={busyId === d.id}
                      className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === d.id ? "İşleniyor…" : "Onayla & Kredi Yükle"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
