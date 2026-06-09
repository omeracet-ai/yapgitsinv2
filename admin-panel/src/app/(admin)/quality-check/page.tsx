"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdStat, AdButton, AdBadge, AdSkeleton } from "@/components/ad";
import { AlertTriangle, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type Result = Awaited<ReturnType<typeof api.saasQualityCheck>>;
type Issue = Result["issues"][number];

const SEVERITY_STYLE: Record<Issue["severity"], { variant: "err" | "warn" | "muted"; icon: React.ReactNode; label: string }> = {
  high: { variant: "err", icon: <XCircle size={14} />, label: "Yüksek" },
  medium: { variant: "warn", icon: <AlertTriangle size={14} />, label: "Orta" },
  low: { variant: "muted", icon: <AlertCircle size={14} />, label: "Düşük" },
};

export default function QualityCheckPage() {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.saasQualityCheck();
      setData(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scoreColor = (s: number) => (s >= 90 ? "#10b981" : s >= 70 ? "#f59e0b" : "#ef4444");

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Kalite Kontrol</h1>
          <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
            Veri hijyeni tarayıcısı — eksik içerik, duplicate kayıt, yarım profilleri tespit eder.
          </p>
        </div>
        <AdButton onClick={load} disabled={loading}>
          <RefreshCw size={14} /> Yeniden Tara
        </AdButton>
      </div>

      {loading && (
        <div style={{ display: "grid", gap: 12 }}>
          <AdSkeleton height={120} />
          <AdSkeleton height={80} />
          <AdSkeleton height={80} />
        </div>
      )}

      {error && (
        <AdCard>
          <p style={{ color: "#ef4444" }}>Hata: {error}</p>
        </AdCard>
      )}

      {data && !loading && (
        <>
          {/* Score banner */}
          <AdCard style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ textAlign: "center", minWidth: 100 }}>
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    color: scoreColor(data.score),
                    lineHeight: 1,
                  }}
                >
                  {data.score}
                </div>
                <div style={{ fontSize: 11, color: "var(--ad-muted)", marginTop: 4 }}>/ 100</div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  {data.score >= 90 ? "Mükemmel kalite" : data.score >= 70 ? "Dikkat gerektiriyor" : "İyileştirme şart"}
                </h3>
                <p style={{ fontSize: 13, color: "var(--ad-muted)", margin: "4px 0 0" }}>
                  {data.totalIssues === 0
                    ? "Hiç sorun bulunamadı."
                    : `${data.totalIssues} sorun bulundu — düşük etkili sorunları geçebilir, yüksek olanları öncelikle ele alın.`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <SeverityChip n={data.bySeverity.high} variant="err" label="Yüksek" />
                <SeverityChip n={data.bySeverity.medium} variant="warn" label="Orta" />
                <SeverityChip n={data.bySeverity.low} variant="muted" label="Düşük" />
              </div>
            </div>
          </AdCard>

          {data.issues.length === 0 ? (
            <AdCard>
              <div style={{ textAlign: "center", padding: 40 }}>
                <CheckCircle2 size={48} style={{ color: "#10b981", margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Tüm kontroller başarılı</h3>
                <p style={{ fontSize: 13, color: "var(--ad-muted)" }}>
                  Veri sağlık skoru maksimum — sorun yok.
                </p>
              </div>
            </AdCard>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {data.issues.map((issue) => (
                <AdCard key={issue.type}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{issue.title}</h3>
                        <AdBadge variant={SEVERITY_STYLE[issue.severity].variant}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {SEVERITY_STYLE[issue.severity].icon}
                            {SEVERITY_STYLE[issue.severity].label}
                          </span>
                        </AdBadge>
                        <AdBadge variant="info">{issue.count}</AdBadge>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--ad-muted)", margin: "4px 0 8px" }}>
                        {issue.description}
                      </p>
                      {issue.fixHint && (
                        <p style={{ fontSize: 12, color: "var(--ad-ink)", margin: 0, fontStyle: "italic" }}>
                          💡 {issue.fixHint}
                        </p>
                      )}
                      {issue.sampleIds && issue.sampleIds.length > 0 && (
                        <details style={{ marginTop: 8, fontSize: 11, color: "var(--ad-muted)" }}>
                          <summary style={{ cursor: "pointer" }}>Örnek ID&apos;ler ({issue.sampleIds.length})</summary>
                          <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 10, wordBreak: "break-all" }}>
                            {issue.sampleIds.join(", ")}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </AdCard>
              ))}
            </div>
          )}

          <p style={{ fontSize: 11, color: "var(--ad-muted)", marginTop: 16 }}>
            Son tarama: {new Date(data.generatedAt).toLocaleString("tr-TR")}
          </p>
        </>
      )}
    </div>
  );
}

function SeverityChip({ n, variant, label }: { n: number; variant: "err" | "warn" | "muted"; label: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 60 }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{n}</div>
      <AdBadge variant={variant}>{label}</AdBadge>
    </div>
  );
}
