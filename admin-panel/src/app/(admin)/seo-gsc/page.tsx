"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdStat, AdTable, AdBadge, AdSelect, AdSkeleton } from "@/components/ad";
import { BarChart3, TrendingUp, MousePointer, Eye } from "lucide-react";

type Report = Awaited<ReturnType<typeof api.saasGsc>>;

export default function SeoGscPage() {
  const [data, setData] = useState<Report | null>(null);
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.saasGsc(Number(days));
      setData(r);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart3 size={22} /> GSC Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
            Google Search Console verisi — 1 saat cache.{" "}
            {data?.source === "mock" && (
              <AdBadge variant="warn">DEMO VERİ</AdBadge>
            )}
          </p>
        </div>
        <AdSelect value={days} onChange={(e) => setDays(e.target.value)} style={{ minWidth: 120 }}>
          <option value="7">Son 7 gün</option>
          <option value="30">Son 30 gün</option>
          <option value="90">Son 90 gün</option>
        </AdSelect>
      </div>

      {loading && <AdSkeleton height={400} />}

      {data && !loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <AdStat label="Tıklama" value={data.totals.clicks.toLocaleString("tr-TR")} icon={<MousePointer />} />
            <AdStat label="Gösterim" value={data.totals.impressions.toLocaleString("tr-TR")} icon={<Eye />} />
            <AdStat label="Ortalama CTR" value={`%${(data.totals.avgCtr * 100).toFixed(2)}`} />
            <AdStat label="Ortalama Pozisyon" value={data.totals.avgPosition.toFixed(1)} icon={<TrendingUp />} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            <Section title="Top Sorgular" rows={data.topQueries} />
            <Section title="Top Sayfalar" rows={data.topPages} />
            <Section title="Hızlı Kazanımlar (poz 11-15)" rows={data.quickWins} variant="success" />
            <Section title="Gerileyen" rows={data.falling} variant="err" />
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  variant,
}: {
  title: string;
  rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
  variant?: "success" | "err";
}) {
  return (
    <AdCard padding={0}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ad-line-soft)", display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</h3>
        {variant && <AdBadge variant={variant === "success" ? "success" : "err"}>{rows.length}</AdBadge>}
      </div>
      <AdTable>
        <thead>
          <tr>
            <th>Anahtar</th>
            <th style={{ textAlign: "right" }}>Tıklama</th>
            <th style={{ textAlign: "right" }}>Gösterim</th>
            <th style={{ textAlign: "right" }}>Pozisyon</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--ad-muted)" }}>
                Veri yok
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.keys.join(", ")}
              </td>
              <td style={{ textAlign: "right", fontSize: 12 }}>{r.clicks}</td>
              <td style={{ textAlign: "right", fontSize: 12 }}>{r.impressions.toLocaleString("tr-TR")}</td>
              <td style={{ textAlign: "right", fontSize: 12 }}>{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </AdTable>
    </AdCard>
  );
}
