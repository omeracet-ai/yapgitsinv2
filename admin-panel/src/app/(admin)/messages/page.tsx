"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdStat, AdTable, AdBadge, AdSelect, AdButton, AdSkeleton } from "@/components/ad";
import { MessageCircle, Mail, Smartphone, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

type Stats = Awaited<ReturnType<typeof api.saasMessagesStats>>;
type Page = Awaited<ReturnType<typeof api.saasMessagesList>>;

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  email: <Mail size={14} />,
  fcm: <Smartphone size={14} />,
  sms: <MessageSquare size={14} />,
  wa: <MessageCircle size={14} />,
};

export default function MessagesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        api.saasMessagesStats(),
        api.saasMessagesList({
          channel: (channel as "email" | "fcm" | "sms" | "wa") || undefined,
          status: (status as "pending" | "sent" | "failed") || undefined,
          page,
          limit: 25,
        }),
      ]);
      setStats(s);
      setData(l);
    } finally {
      setLoading(false);
    }
  }, [channel, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <MessageCircle size={22} /> Mesaj Logu
        </h1>
        <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
          Tüm giden e-posta / FCM / SMS / WhatsApp mesajları — 30 gün geriye dönük.
        </p>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          <AdStat label="Toplam" value={stats.total} />
          <AdStat label="Gönderildi" value={stats.sent} />
          <AdStat label="Başarısız" value={stats.failed} />
          <AdStat label="Son 24 saat" value={stats.last24h} />
        </div>
      )}

      <AdCard style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
          <AdSelect
            label="Kanal"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tümü</option>
            <option value="email">E-posta</option>
            <option value="fcm">FCM Push</option>
            <option value="sms">SMS</option>
            <option value="wa">WhatsApp</option>
          </AdSelect>
          <AdSelect
            label="Durum"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tümü</option>
            <option value="sent">Gönderildi</option>
            <option value="failed">Başarısız</option>
            <option value="pending">Beklemede</option>
          </AdSelect>
          <AdButton variant="secondary" onClick={load}>
            Yenile
          </AdButton>
        </div>
      </AdCard>

      {loading && <AdSkeleton height={300} />}

      {data && !loading && (
        <AdCard padding={0}>
          <AdTable>
            <thead>
              <tr>
                <th>Kanal</th>
                <th>Alıcı</th>
                <th>Konu</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {data.data.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--ad-muted)" }}>
                    Kayıt bulunamadı
                  </td>
                </tr>
              )}
              {data.data.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {CHANNEL_ICON[m.channel]} {m.channel.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{m.recipient}</td>
                  <td style={{ fontSize: 12, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.subject ?? <span style={{ color: "var(--ad-muted)" }}>—</span>}
                  </td>
                  <td>
                    <AdBadge variant={m.status === "sent" ? "success" : m.status === "failed" ? "err" : "warn"}>
                      {m.status}
                    </AdBadge>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--ad-muted)" }}>
                    {new Date(m.createdAt).toLocaleString("tr-TR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdTable>

          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--ad-line-soft)" }}>
            <span style={{ fontSize: 12, color: "var(--ad-muted)" }}>
              Sayfa {data.page} / {data.pages} — Toplam {data.total}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <AdButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft size={14} />
              </AdButton>
              <AdButton size="sm" variant="secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight size={14} />
              </AdButton>
            </div>
          </div>
        </AdCard>
      )}
    </div>
  );
}
