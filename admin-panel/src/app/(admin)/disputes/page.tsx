"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AdminDispute, type DisputeAiAnalysis } from "@/lib/api";

type StatusFilter = "all" | "open" | "in_review" | "resolved" | "dismissed";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "open", label: "Açık" },
  { value: "in_review", label: "İncelemede" },
  { value: "resolved", label: "Çözüldü" },
  { value: "dismissed", label: "Reddedildi" },
  { value: "all", label: "Tümü" },
];

const TYPE_LABELS: Record<string, string> = {
  quality: "Kalite",
  payment: "Ödeme",
  no_show: "Gelmedi",
  fraud: "Dolandırıcılık",
  other: "Diğer",
};

const ACTION_LABELS: Record<DisputeAiAnalysis["suggestedAction"], string> = {
  refund: "Tam İade",
  partial_refund: "Kısmi İade",
  cancel: "İptal",
  dismiss: "Reddet",
  escalate: "Üst Birime",
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("tr-TR"); } catch { return s; }
}

function fraudBadge(risk: DisputeAiAnalysis["fraudRisk"]) {
  const map = {
    low: "bg-emerald-100 text-emerald-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-rose-100 text-rose-800",
  };
  const lbl = { low: "Düşük", medium: "Orta", high: "Yüksek" };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${map[risk]}`}>
      Sahtelik: {lbl[risk]}
    </span>
  );
}

function statusBadge(status: AdminDispute["status"]) {
  const map = {
    open: "bg-blue-100 text-blue-800",
    in_review: "bg-amber-100 text-amber-800",
    resolved: "bg-emerald-100 text-emerald-800",
    dismissed: "bg-slate-200 text-slate-700",
  };
  const lbl = { open: "Açık", in_review: "İncelemede", resolved: "Çözüldü", dismissed: "Reddedildi" };
  return <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${map[status]}`}>{lbl[status]}</span>;
}

function suggestedActionToResolveStatus(
  action: DisputeAiAnalysis["suggestedAction"],
): "resolved" | "dismissed" {
  return action === "dismiss" ? "dismissed" : "resolved";
}

function suggestedActionToResolutionText(
  action: DisputeAiAnalysis["suggestedAction"],
  reasoning: string,
): string {
  const prefix: Record<DisputeAiAnalysis["suggestedAction"], string> = {
    refund: "Tam iade onaylandı.",
    partial_refund: "Kısmi iade onaylandı.",
    cancel: "İşlem iptal edildi.",
    dismiss: "Şikayet reddedildi (haklı bulunmadı).",
    escalate: "Üst incelemeye alındı.",
  };
  return `${prefix[action]}\n\nAI gerekçe: ${reasoning}`;
}

export default function DisputesPage() {
  const [items, setItems] = useState<AdminDispute[]>([]);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<AdminDispute | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const [resolveStatus, setResolveStatus] = useState<"resolved" | "dismissed">("resolved");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.disputes({ status, limit: 50 });
      setItems(r.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = (d: AdminDispute) => {
    setActive(d);
    if (d.aiAnalysis) {
      setResolveStatus(suggestedActionToResolveStatus(d.aiAnalysis.suggestedAction));
      setResolutionText(suggestedActionToResolutionText(d.aiAnalysis.suggestedAction, d.aiAnalysis.reasoning));
    } else {
      setResolveStatus("resolved");
      setResolutionText("");
    }
  };

  const applyAi = () => {
    if (!active?.aiAnalysis) return;
    setResolveStatus(suggestedActionToResolveStatus(active.aiAnalysis.suggestedAction));
    setResolutionText(suggestedActionToResolutionText(active.aiAnalysis.suggestedAction, active.aiAnalysis.reasoning));
  };

  const submitResolve = async () => {
    if (!active) return;
    if (!resolutionText.trim()) { alert("Çözüm metni girin"); return; }
    setResolving(true);
    try {
      await api.resolveDispute(active.id, { status: resolveStatus, resolution: resolutionText.trim() });
      setActive(null);
      await load();
    } catch (e) {
      alert("Hata: " + (e as Error).message);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Anlaşmazlıklar</h1>
      <p className="text-sm text-slate-500 mb-4">AI ön-analizli şikayet yönetimi</p>

      <div className="flex gap-2 mb-4 border-b border-slate-200">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              status === t.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-slate-500">Yükleniyor…</div>}
      {error && <div className="text-sm text-rose-600 mb-3">Hata: {error}</div>}

      {!loading && items.length === 0 && (
        <div className="text-sm text-slate-400 italic">Bu filtrede şikayet yok.</div>
      )}

      <div className="grid gap-3">
        {items.map((d) => (
          <button
            key={d.id}
            onClick={() => openDetail(d)}
            className="text-left bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-slate-400">#{d.id.slice(0, 8)}</span>
                  {statusBadge(d.status)}
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {TYPE_LABELS[d.type] || d.type}
                  </span>
                  {d.aiAnalysis && fraudBadge(d.aiAnalysis.fraudRisk)}
                  {d.aiAnalysis && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                      Adillik: {d.aiAnalysis.fairnessScore}/100
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-700 line-clamp-2">{d.description}</div>
                <div className="text-xs text-slate-400 mt-1">{fmtDate(d.createdAt)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setActive(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold">Şikayet #{active.id.slice(0, 8)}</h2>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {statusBadge(active.status)}
                <span className="px-2 py-0.5 rounded bg-slate-100">{TYPE_LABELS[active.type] || active.type}</span>
                <span className="text-slate-500">{fmtDate(active.createdAt)}</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Açıklama</div>
                <div className="text-sm whitespace-pre-wrap bg-slate-50 rounded p-3">{active.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Şikayetçi</div>
                  <div className="font-mono">{active.raisedBy.slice(0, 12)}…</div>
                </div>
                <div>
                  <div className="text-slate-500">Şikayet Edilen</div>
                  <div className="font-mono">{active.againstUserId.slice(0, 12)}…</div>
                </div>
                {active.jobId && (
                  <div><div className="text-slate-500">İş ID</div><div className="font-mono">{active.jobId.slice(0, 12)}…</div></div>
                )}
                {active.bookingId && (
                  <div><div className="text-slate-500">Randevu ID</div><div className="font-mono">{active.bookingId.slice(0, 12)}…</div></div>
                )}
              </div>

              {active.aiAnalysis ? (
                <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-blue-900">🤖 AI Ön-Analiz</div>
                    <div className="text-xs text-slate-500">{fmtDate(active.aiAnalysis.analyzedAt)}</div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Adillik (şikayetçi haklılığı)</span>
                      <span className="font-medium">{active.aiAnalysis.fairnessScore}/100</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-500"
                        style={{ width: `${active.aiAnalysis.fairnessScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {fraudBadge(active.aiAnalysis.fraudRisk)}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-medium">
                      Öneri: {ACTION_LABELS[active.aiAnalysis.suggestedAction]}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 mb-1">Gerekçe</div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{active.aiAnalysis.reasoning}</div>
                  </div>

                  {active.status !== "resolved" && active.status !== "dismissed" && (
                    <button
                      onClick={applyAi}
                      className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
                    >
                      ✨ AI Önerisini Uygula
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic border border-dashed border-slate-300 rounded p-3">
                  AI analizi henüz mevcut değil (ANTHROPIC_API_KEY eksik veya analiz devam ediyor).
                </div>
              )}

              {active.status === "resolved" || active.status === "dismissed" ? (
                <div>
                  <div className="text-xs text-slate-500 uppercase mb-1">Çözüm</div>
                  <div className="text-sm whitespace-pre-wrap bg-emerald-50 border border-emerald-200 rounded p-3">{active.resolution}</div>
                  <div className="text-xs text-slate-400 mt-1">{fmtDate(active.resolvedAt)}</div>
                </div>
              ) : (
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <div className="text-sm font-semibold">Çözümle</div>
                  <div className="flex gap-2">
                    <select
                      value={resolveStatus}
                      onChange={(e) => setResolveStatus(e.target.value as "resolved" | "dismissed")}
                      className="border border-slate-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="resolved">Çözüldü</option>
                      <option value="dismissed">Reddet</option>
                    </select>
                  </div>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    rows={4}
                    placeholder="Çözüm açıklaması…"
                    className="w-full border border-slate-300 rounded p-2 text-sm"
                  />
                  <button
                    onClick={submitResolve}
                    disabled={resolving}
                    className="w-full px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
                  >
                    {resolving ? "Kaydediliyor…" : "Çözümü Kaydet"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
