"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdStat, AdTable, AdBadge, AdButton, AdSkeleton, AdModal, AdInput, AdTextarea } from "@/components/ad";
import { Award, Crown, Medal, Star, Gift } from "lucide-react";

type Leader = Awaited<ReturnType<typeof api.saasLoyaltyLeaderboard>>[number];
type TierStat = Awaited<ReturnType<typeof api.saasLoyaltyTierStats>>[number];

const TIER_ICON: Record<string, React.ReactNode> = {
  Bronze: <Medal size={14} style={{ color: "#cd7f32" }} />,
  Silver: <Medal size={14} style={{ color: "#c0c0c0" }} />,
  Gold: <Star size={14} style={{ color: "#ffd700" }} />,
  Platinum: <Crown size={14} style={{ color: "#e5e4e2" }} />,
};

const TIER_VARIANT: Record<string, "muted" | "info" | "warn" | "success"> = {
  Bronze: "muted",
  Silver: "info",
  Gold: "warn",
  Platinum: "success",
};

export default function LoyaltyPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [tierStats, setTierStats] = useState<TierStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantOpen, setGrantOpen] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPoints, setGrantPoints] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [grantError, setGrantError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, t] = await Promise.all([
        api.saasLoyaltyLeaderboard(50),
        api.saasLoyaltyTierStats(),
      ]);
      setLeaders(l);
      setTierStats(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grant = async () => {
    if (!grantUserId.trim() || !grantPoints) return;
    setGranting(true);
    setGrantError(null);
    try {
      await api.saasLoyaltyGrant({
        userId: grantUserId.trim(),
        points: Number(grantPoints),
        reason: grantReason.trim() || undefined,
      });
      setGrantOpen(false);
      setGrantUserId("");
      setGrantPoints("");
      setGrantReason("");
      void load();
    } catch (e) {
      setGrantError(e instanceof Error ? e.message : "Hata");
    } finally {
      setGranting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={22} /> Sadakat & Tier
          </h1>
          <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
            Liderlik tablosu, tier dağılımı ve manuel bonus puan tanımlama.
          </p>
        </div>
        <AdButton onClick={() => setGrantOpen(true)}>
          <Gift size={14} /> Bonus Tanımla
        </AdButton>
      </div>

      {tierStats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          {tierStats.map((t) => (
            <AdStat key={t.tier} label={t.tier} value={t.count} icon={TIER_ICON[t.tier]} />
          ))}
        </div>
      )}

      {loading && <AdSkeleton height={400} />}

      {!loading && (
        <AdCard padding={0}>
          <AdTable>
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Kullanıcı</th>
                <th>Tier</th>
                <th>Toplam Başarı</th>
                <th>Kredi</th>
              </tr>
            </thead>
            <tbody>
              {leaders.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--ad-muted)" }}>
                    Kayıt yok
                  </td>
                </tr>
              )}
              {leaders.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{i + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {u.profileImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.profileImageUrl}
                          alt=""
                          style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{u.fullName}</div>
                        <div style={{ fontSize: 11, color: "var(--ad-muted)" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <AdBadge variant={TIER_VARIANT[u.tier]}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {TIER_ICON[u.tier]} {u.tier}
                      </span>
                    </AdBadge>
                  </td>
                  <td>{u.totalSuccess}</td>
                  <td>{u.tokenBalance}</td>
                </tr>
              ))}
            </tbody>
          </AdTable>
        </AdCard>
      )}

      <AdModal open={grantOpen} onClose={() => setGrantOpen(false)} title="Bonus Puan Tanımla">
        <div style={{ display: "grid", gap: 12 }}>
          <AdInput
            label="Kullanıcı ID"
            value={grantUserId}
            onChange={(e) => setGrantUserId(e.target.value)}
            placeholder="uuid"
          />
          <AdInput
            label="Puan"
            type="number"
            value={grantPoints}
            onChange={(e) => setGrantPoints(e.target.value)}
            placeholder="örn. 100"
          />
          <AdTextarea
            label="Sebep (opsiyonel)"
            value={grantReason}
            onChange={(e) => setGrantReason(e.target.value)}
            placeholder="VIP hoş geldin bonusu"
            rows={2}
          />
          {grantError && <p style={{ color: "#ef4444", fontSize: 12 }}>{grantError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <AdButton variant="secondary" onClick={() => setGrantOpen(false)}>
              Vazgeç
            </AdButton>
            <AdButton onClick={grant} loading={granting} disabled={!grantUserId.trim() || !grantPoints}>
              Tanımla
            </AdButton>
          </div>
        </div>
      </AdModal>
    </div>
  );
}
