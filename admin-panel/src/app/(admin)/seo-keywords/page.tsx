"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdTable, AdButton, AdBadge, AdSkeleton, AdModal } from "@/components/ad";
import { Search, Wand2, FileText } from "lucide-react";

type Opp = Awaited<ReturnType<typeof api.saasKeywordOpportunities>>["items"][number];
type Draft = Awaited<ReturnType<typeof api.saasKeywordDraftList>>["items"][number];

export default function SeoKeywordsPage() {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [openDraft, setOpenDraft] = useState<Draft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, d] = await Promise.all([
        api.saasKeywordOpportunities(),
        api.saasKeywordDraftList(),
      ]);
      setOpps(o.items);
      setDrafts(d.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async (opp: Opp) => {
    const q = opp.keys[0];
    if (!q) return;
    setGenerating(q);
    try {
      await api.saasKeywordDraftCreate({
        query: q,
        gscPosition: opp.position,
        gscImpressions: opp.impressions,
      });
      await load();
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={22} /> Keyword Finder
        </h1>
        <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
          GSC&apos;de fırsat sinyali veren sorgular için Gemini ile blog taslağı üret.
        </p>
      </div>

      {loading && <AdSkeleton height={400} />}

      {!loading && (
        <div style={{ display: "grid", gap: 16 }}>
          <AdCard padding={0}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ad-line-soft)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Fırsatlar (poz 11-15)</h3>
            </div>
            <AdTable>
              <thead>
                <tr>
                  <th>Anahtar</th>
                  <th style={{ textAlign: "right" }}>Gösterim</th>
                  <th style={{ textAlign: "right" }}>Pozisyon</th>
                  <th style={{ width: 140 }}></th>
                </tr>
              </thead>
              <tbody>
                {opps.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--ad-muted)" }}>
                      Fırsat yok
                    </td>
                  </tr>
                )}
                {opps.map((o, i) => {
                  const q = o.keys[0];
                  return (
                    <tr key={i}>
                      <td style={{ fontSize: 13 }}>{q}</td>
                      <td style={{ textAlign: "right", fontSize: 12 }}>{o.impressions}</td>
                      <td style={{ textAlign: "right", fontSize: 12 }}>{o.position.toFixed(1)}</td>
                      <td>
                        <AdButton
                          size="sm"
                          onClick={() => generate(o)}
                          loading={generating === q}
                          disabled={!!generating}
                        >
                          <Wand2 size={12} /> Taslak
                        </AdButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </AdTable>
          </AdCard>

          <AdCard padding={0}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ad-line-soft)", display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Üretilmiş Taslaklar</h3>
              <AdBadge variant="info">{drafts.length}</AdBadge>
            </div>
            <AdTable>
              <thead>
                <tr>
                  <th>Sorgu</th>
                  <th>Slug</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {drafts.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--ad-muted)" }}>
                      Henüz taslak yok
                    </td>
                  </tr>
                )}
                {drafts.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontSize: 13 }}>{d.query}</td>
                    <td style={{ fontSize: 12, fontFamily: "monospace" }}>{d.slug}</td>
                    <td>
                      <AdBadge variant={d.status === "published" ? "success" : "muted"}>{d.status}</AdBadge>
                    </td>
                    <td style={{ fontSize: 11, color: "var(--ad-muted)" }}>
                      {new Date(d.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td>
                      <AdButton size="sm" variant="secondary" onClick={() => setOpenDraft(d)}>
                        <FileText size={12} /> Görüntüle
                      </AdButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdTable>
          </AdCard>
        </div>
      )}

      <AdModal open={!!openDraft} onClose={() => setOpenDraft(null)} title={openDraft?.query} width={760}>
        {openDraft && (
          <div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                lineHeight: 1.6,
                fontFamily: "ui-monospace, monospace",
                background: "var(--ad-bg-elev, rgba(255,255,255,0.04))",
                padding: 16,
                borderRadius: 8,
                maxHeight: 500,
                overflowY: "auto",
              }}
            >
              {openDraft.markdown}
            </pre>
          </div>
        )}
      </AdModal>
    </div>
  );
}
