"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdStat, AdTable, AdButton, AdBadge, AdSkeleton, AdModal, AdInput, AdSelect } from "@/components/ad";
import { AlertTriangle, Plus, Trash2, ArrowRight } from "lucide-react";

type NfList = Awaited<ReturnType<typeof api.saasNotFoundList>>;
type RedirList = Awaited<ReturnType<typeof api.saasRedirectsList>>;

export default function Seo404Page() {
  const [nf, setNf] = useState<NfList | null>(null);
  const [redir, setRedir] = useState<RedirList | null>(null);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");
  const [status, setStatus] = useState<"301" | "302">("301");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([api.saasNotFoundList(100), api.saasRedirectsList()]);
      setNf(a);
      setRedir(b);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createRedirect = async (prefilledSrc?: string) => {
    if (prefilledSrc) {
      setSrc(prefilledSrc);
      setCreateOpen(true);
      return;
    }
    if (!src.trim() || !dst.trim()) return;
    setCreating(true);
    try {
      await api.saasRedirectCreate({
        src: src.trim(),
        dst: dst.trim(),
        status: status === "301" ? 301 : 302,
      });
      setSrc("");
      setDst("");
      setCreateOpen(false);
      void load();
    } finally {
      setCreating(false);
    }
  };

  const deleteRedirect = async (id: string) => {
    if (!confirm("Yönlendirmeyi sil?")) return;
    await api.saasRedirectDelete(id);
    void load();
  };

  const deleteNf = async (id: string) => {
    if (!confirm("Logu sil?")) return;
    await api.saasNotFoundDelete(id);
    void load();
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={22} /> 404 İzleme
          </h1>
          <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
            yapgitsin.tr 404 isabetleri + yönlendirme kuralları — SEO juice kaybını önle.
          </p>
        </div>
        <AdButton onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Yönlendirme Ekle
        </AdButton>
      </div>

      {nf && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          <AdStat label="404 URL" value={nf.total} />
          <AdStat label="Son 24 saat" value={nf.last24h} />
          <AdStat label="Aktif Yönlendirme" value={redir?.total ?? 0} />
        </div>
      )}

      {loading && <AdSkeleton height={300} />}

      {!loading && (
        <div style={{ display: "grid", gap: 16 }}>
          <AdCard padding={0}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ad-line-soft)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>404 Logu</h3>
            </div>
            <AdTable>
              <thead>
                <tr>
                  <th>URL</th>
                  <th style={{ textAlign: "right" }}>İsabet</th>
                  <th>Son Görülme</th>
                  <th style={{ width: 180 }}></th>
                </tr>
              </thead>
              <tbody>
                {nf && nf.items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--ad-muted)" }}>
                      Henüz 404 isabet yok
                    </td>
                  </tr>
                )}
                {nf?.items.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12, fontFamily: "monospace", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.url}
                    </td>
                    <td style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>{l.hitCount}</td>
                    <td style={{ fontSize: 11, color: "var(--ad-muted)" }}>
                      {new Date(l.lastSeenAt).toLocaleString("tr-TR")}
                    </td>
                    <td style={{ display: "flex", gap: 6 }}>
                      <AdButton size="sm" onClick={() => createRedirect(l.url)}>
                        <ArrowRight size={12} /> Yönlendir
                      </AdButton>
                      <AdButton size="sm" variant="danger" onClick={() => deleteNf(l.id)}>
                        <Trash2 size={12} />
                      </AdButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdTable>
          </AdCard>

          <AdCard padding={0}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ad-line-soft)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Yönlendirmeler</h3>
            </div>
            <AdTable>
              <thead>
                <tr>
                  <th>Kaynak</th>
                  <th>Hedef</th>
                  <th>Durum</th>
                  <th style={{ textAlign: "right" }}>İsabet</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {redir && redir.items.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--ad-muted)" }}>
                      Yönlendirme yok
                    </td>
                  </tr>
                )}
                {redir?.items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12, fontFamily: "monospace" }}>{r.src}</td>
                    <td style={{ fontSize: 12, fontFamily: "monospace" }}>{r.dst}</td>
                    <td>
                      <AdBadge variant={r.status === 301 ? "info" : "warn"}>{r.status}</AdBadge>
                    </td>
                    <td style={{ textAlign: "right", fontSize: 12 }}>{r.hits}</td>
                    <td>
                      <AdButton size="sm" variant="danger" onClick={() => deleteRedirect(r.id)}>
                        <Trash2 size={12} />
                      </AdButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdTable>
          </AdCard>
        </div>
      )}

      <AdModal open={createOpen} onClose={() => setCreateOpen(false)} title="Yeni Yönlendirme">
        <div style={{ display: "grid", gap: 12 }}>
          <AdInput
            label="Kaynak URL"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="/eski-sayfa"
          />
          <AdInput
            label="Hedef URL"
            value={dst}
            onChange={(e) => setDst(e.target.value)}
            placeholder="/yeni-sayfa"
          />
          <AdSelect label="Durum Kodu" value={status} onChange={(e) => setStatus(e.target.value as "301" | "302")}>
            <option value="301">301 — Kalıcı</option>
            <option value="302">302 — Geçici</option>
          </AdSelect>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <AdButton variant="secondary" onClick={() => setCreateOpen(false)}>
              Vazgeç
            </AdButton>
            <AdButton onClick={() => createRedirect()} loading={creating} disabled={!src.trim() || !dst.trim()}>
              Oluştur
            </AdButton>
          </div>
        </div>
      </AdModal>
    </div>
  );
}
