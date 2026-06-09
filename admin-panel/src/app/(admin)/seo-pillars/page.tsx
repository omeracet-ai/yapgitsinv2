"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdTable, AdButton, AdBadge, AdSkeleton, AdModal, AdInput } from "@/components/ad";
import { Layers, Plus, Wand2, Trash2, Eye } from "lucide-react";

type Pillar = Awaited<ReturnType<typeof api.saasPillarsList>>["items"][number];
type PillarDetail = Awaited<ReturnType<typeof api.saasPillarGet>>;

export default function SeoPillarsPage() {
  const [items, setItems] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [openDetail, setOpenDetail] = useState<PillarDetail | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.saasPillarsList();
      setItems(r.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!title.trim() || !topic.trim()) return;
    setCreating(true);
    try {
      await api.saasPillarCreate({ title: title.trim(), topic: topic.trim() });
      setTitle("");
      setTopic("");
      setCreateOpen(false);
      void load();
    } finally {
      setCreating(false);
    }
  };

  const generate = async (id: string) => {
    setGenerating(id);
    try {
      await api.saasPillarGenerate(id);
      // Poll for completion
      const interval = setInterval(async () => {
        try {
          const s = await api.saasPillarStatus(id);
          if (s.generationStatus !== "running") {
            clearInterval(interval);
            setGenerating(null);
            void load();
          }
        } catch {
          clearInterval(interval);
          setGenerating(null);
        }
      }, 3000);
      // Timeout safety 90s
      setTimeout(() => {
        clearInterval(interval);
        setGenerating(null);
        void load();
      }, 90_000);
    } catch {
      setGenerating(null);
    }
  };

  const view = async (id: string) => {
    const p = await api.saasPillarGet(id);
    setOpenDetail(p);
  };

  const del = async (id: string) => {
    if (!confirm("Pillar sayfayı silmek istediğinden emin misin?")) return;
    await api.saasPillarDelete(id);
    void load();
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={22} /> Pillar Sayfaları
          </h1>
          <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
            SEO pillar+cluster mimarisi — 29 hizmet kategorisi için Gemini ile içerik üret.
          </p>
        </div>
        <AdButton onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Yeni Pillar
        </AdButton>
      </div>

      {loading && <AdSkeleton height={300} />}

      {!loading && (
        <AdCard padding={0}>
          <AdTable>
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Konu</th>
                <th>Slug</th>
                <th>Durum</th>
                <th style={{ width: 220 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--ad-muted)" }}>
                    Pillar yok — yeni ekle
                  </td>
                </tr>
              )}
              {items.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{p.title}</td>
                  <td style={{ fontSize: 12, color: "var(--ad-muted)" }}>{p.topic}</td>
                  <td style={{ fontSize: 11, fontFamily: "monospace", color: "var(--ad-muted)" }}>{p.slug}</td>
                  <td>
                    <AdBadge
                      variant={
                        p.generationStatus === "done"
                          ? "success"
                          : p.generationStatus === "running"
                            ? "info"
                            : p.generationStatus === "failed"
                              ? "err"
                              : "muted"
                      }
                    >
                      {p.generationStatus}
                    </AdBadge>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <AdButton size="sm" variant="secondary" onClick={() => view(p.id)}>
                      <Eye size={12} />
                    </AdButton>
                    <AdButton
                      size="sm"
                      onClick={() => generate(p.id)}
                      loading={generating === p.id}
                      disabled={!!generating}
                    >
                      <Wand2 size={12} /> AI
                    </AdButton>
                    <AdButton size="sm" variant="danger" onClick={() => del(p.id)}>
                      <Trash2 size={12} />
                    </AdButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdTable>
        </AdCard>
      )}

      <AdModal open={createOpen} onClose={() => setCreateOpen(false)} title="Yeni Pillar Sayfa">
        <div style={{ display: "grid", gap: 12 }}>
          <AdInput
            label="Başlık"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="örn. Ev Temizliği Rehberi"
          />
          <AdInput
            label="Konu"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="örn. ev-temizlik"
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <AdButton variant="secondary" onClick={() => setCreateOpen(false)}>
              Vazgeç
            </AdButton>
            <AdButton onClick={create} loading={creating} disabled={!title.trim() || !topic.trim()}>
              Oluştur
            </AdButton>
          </div>
        </div>
      </AdModal>

      <AdModal open={!!openDetail} onClose={() => setOpenDetail(null)} title={openDetail?.title} width={800}>
        {openDetail && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <AdBadge variant="info">{openDetail.topic}</AdBadge>
              <AdBadge variant="muted">{openDetail.slug}</AdBadge>
              <AdBadge variant={openDetail.generationStatus === "done" ? "success" : "muted"}>
                {openDetail.generationStatus}
              </AdBadge>
            </div>
            {openDetail.generationError && (
              <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{openDetail.generationError}</p>
            )}
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
              {openDetail.content ?? "(İçerik üretilmemiş — AI butonuna tıkla)"}
            </pre>
          </div>
        )}
      </AdModal>
    </div>
  );
}
