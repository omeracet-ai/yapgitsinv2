"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdButton, AdInput, AdBadge, AdSkeleton } from "@/components/ad";
import { Globe, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";

type Report = Awaited<ReturnType<typeof api.saasDnsHealth>>;

const STATUS_TONE: Record<string, { variant: "success" | "err" | "warn" | "muted"; icon: React.ReactNode }> = {
  ok: { variant: "success", icon: <CheckCircle2 size={14} /> },
  missing: { variant: "err", icon: <XCircle size={14} /> },
  warn: { variant: "warn", icon: <AlertCircle size={14} /> },
  error: { variant: "err", icon: <XCircle size={14} /> },
};

export default function DnsHealthPage() {
  const [domain, setDomain] = useState("yapgitsin.tr");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.saasDnsHealth(domain);
      setData(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoreColor = (s: number) => (s >= 80 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444");

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Globe size={22} /> DNS Sağlığı
        </h1>
        <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
          SPF / DKIM / DMARC / MX / A / NS canlı sorgu — email deliverability sağlık kontrolü.
        </p>
      </div>

      <AdCard style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <AdInput
              label="Domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yapgitsin.tr"
            />
          </div>
          <AdButton onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Tara
          </AdButton>
        </div>
      </AdCard>

      {loading && (
        <div style={{ display: "grid", gap: 12 }}>
          <AdSkeleton height={120} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <AdSkeleton key={i} height={100} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <AdCard>
          <p style={{ color: "#ef4444" }}>Hata: {error}</p>
        </AdCard>
      )}

      {data && !loading && (
        <>
          <AdCard style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ textAlign: "center", minWidth: 100 }}>
                <div style={{ fontSize: 48, fontWeight: 700, color: scoreColor(data.score), lineHeight: 1 }}>
                  {data.score}
                </div>
                <div style={{ fontSize: 11, color: "var(--ad-muted)" }}>/ 100</div>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{data.domain}</h3>
                <p style={{ fontSize: 13, color: "var(--ad-muted)", margin: "4px 0 0" }}>
                  {data.checks.filter((c) => c.status === "ok").length} / {data.checks.length} kayıt sağlıklı —{" "}
                  {data.durationMs}ms
                </p>
              </div>
            </div>
          </AdCard>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {data.checks.map((c) => (
              <AdCard key={c.type}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{c.type}</h4>
                  <AdBadge variant={STATUS_TONE[c.status]?.variant ?? "muted"}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {STATUS_TONE[c.status]?.icon}
                      {c.status.toUpperCase()}
                    </span>
                  </AdBadge>
                </div>
                {c.message && (
                  <p style={{ fontSize: 12, color: "var(--ad-muted)", margin: "4px 0 8px" }}>
                    {c.message}
                  </p>
                )}
                {c.records.length > 0 ? (
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ad-ink)" }}>
                    {c.records.slice(0, 5).map((r, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "4px 8px",
                          marginTop: 4,
                          background: "var(--ad-bg-elev, rgba(255,255,255,0.04))",
                          borderRadius: 4,
                          wordBreak: "break-all",
                        }}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--ad-muted)", fontStyle: "italic" }}>Kayıt yok</p>
                )}
              </AdCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
