"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdStat, AdBadge, AdSkeleton } from "@/components/ad";
import { Clock, Bell, Trash2, AlarmClock, RefreshCw, Activity } from "lucide-react";

type CronItem = Awaited<ReturnType<typeof api.saasCronHub>>["items"][number];

const CATEGORY_LABEL: Record<string, string> = {
  cleanup: "Temizlik",
  reminder: "Hatırlatma",
  expiry: "Süre Dolumu",
  sync: "Senkron",
  health: "Sağlık",
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  cleanup: <Trash2 size={14} />,
  reminder: <Bell size={14} />,
  expiry: <AlarmClock size={14} />,
  sync: <RefreshCw size={14} />,
  health: <Activity size={14} />,
};

export default function CronHubPage() {
  const [items, setItems] = useState<CronItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.saasCronHub();
        if (cancelled) return;
        setItems(r.items);
        setCategories(r.categories);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = filter === "all" ? items : items.filter((c) => c.category === filter);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Cron Hub</h1>
        <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
          Yapgitsin&apos;de tanımlı zamanlanmış görevlerin kataloğu — NestJS @Cron decorator&apos;ları
          ile çalışır, harici scheduler gerektirmez.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <AdStat label="Toplam Görev" value={items.length} icon={<Clock />} />
        <AdStat label="Kategori" value={categories.length} />
        <AdStat label="Çalıştırma" value="Otomatik" sub="Harici cron-job.org gerekmez" />
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          Tümü ({items.length})
        </FilterPill>
        {categories.map((c) => (
          <FilterPill key={c} active={filter === c} onClick={() => setFilter(c)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {CATEGORY_ICON[c] ?? null}
              {CATEGORY_LABEL[c] ?? c} ({items.filter((i) => i.category === c).length})
            </span>
          </FilterPill>
        ))}
      </div>

      {loading && (
        <div style={{ display: "grid", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <AdSkeleton key={i} style={{ height: 80 }} />
          ))}
        </div>
      )}

      {error && (
        <AdCard>
          <p style={{ color: "var(--ad-danger, #ef4444)" }}>Hata: {error}</p>
        </AdCard>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((item) => (
          <AdCard key={item.name}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{item.name}</h3>
                  <AdBadge variant="muted">{CATEGORY_LABEL[item.category] ?? item.category}</AdBadge>
                  {item.internal && <AdBadge variant="success">Dahili</AdBadge>}
                </div>
                <p style={{ fontSize: 13, color: "var(--ad-muted)", margin: "4px 0 8px" }}>
                  {item.description}
                </p>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--ad-muted)" }}>
                  <span>
                    <Clock size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }} />
                    {item.schedulePretty}
                  </span>
                  <code style={{ fontSize: 11, opacity: 0.7 }}>{item.module}</code>
                </div>
              </div>
            </div>
          </AdCard>
        ))}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 999,
        border: active ? "1px solid var(--ad-gold)" : "1px solid var(--ad-line-soft)",
        background: active ? "var(--ad-gold)" : "transparent",
        color: active ? "var(--ad-card)" : "var(--ad-ink)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
