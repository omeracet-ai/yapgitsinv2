"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdBadge, AdSkeleton } from "@/components/ad";
import { KeyRound, X } from "lucide-react";

type Matrix = Awaited<ReturnType<typeof api.saasRbacMatrix>>;

export default function RbacPage() {
  const [data, setData] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await api.saasRbacMatrix();
        setData(r);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <KeyRound size={22} /> Yetki Matrisi (RBAC)
        </h1>
        <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
          Çoklu admin rol modeli tasarım önizlemesi.
        </p>
      </div>

      {data?.note && (
        <AdCard style={{ marginBottom: 16, background: "var(--ad-bg-elev, rgba(255,255,255,0.04))" }}>
          <p style={{ fontSize: 12, color: "var(--ad-muted)", margin: 0 }}>
            ℹ️ {data.note}
          </p>
        </AdCard>
      )}

      {loading && <AdSkeleton height={500} />}

      {!loading && data && (
        <>
          {/* Role overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
            {data.roles.map((r) => (
              <AdCard key={r.key}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{r.name}</h3>
                <p style={{ fontSize: 11, color: "var(--ad-muted)", marginTop: 4 }}>{r.description}</p>
                <div style={{ marginTop: 8 }}>
                  <AdBadge variant="muted">{r.key}</AdBadge>
                </div>
              </AdCard>
            ))}
          </div>

          <AdCard padding={0} style={{ overflowX: "auto" }}>
            <table className="ad-table" style={{ minWidth: "100%" }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", left: 0, background: "var(--ad-card)", zIndex: 1 }}>Modül</th>
                  {data.roles.map((r) => (
                    <th key={r.key} style={{ textAlign: "center", minWidth: 120 }}>
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.modules.map((m) => (
                  <tr key={m}>
                    <td style={{ fontSize: 12, fontFamily: "monospace", position: "sticky", left: 0, background: "var(--ad-card)" }}>
                      {m}
                    </td>
                    {data.roles.map((r) => {
                      const perms = r.permissions[m] ?? [];
                      return (
                        <td key={r.key} style={{ textAlign: "center" }}>
                          <PermDots perms={perms} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </AdCard>

          <div style={{ marginTop: 12, fontSize: 11, color: "var(--ad-muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Legend variant="success" label="read" />
            <Legend variant="info" label="write" />
            <Legend variant="err" label="delete" />
          </div>
        </>
      )}
    </div>
  );
}

function PermDots({ perms }: { perms: string[] }) {
  if (perms.length === 0) {
    return <X size={14} style={{ color: "var(--ad-muted)", opacity: 0.4 }} />;
  }
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {perms.includes("read") && <Dot color="#10b981" />}
      {perms.includes("write") && <Dot color="#3b82f6" />}
      {perms.includes("delete") && <Dot color="#ef4444" />}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
      }}
    />
  );
}

function Legend({ variant, label }: { variant: "success" | "info" | "err"; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Dot color={variant === "success" ? "#10b981" : variant === "info" ? "#3b82f6" : "#ef4444"} />
      <code style={{ fontSize: 11 }}>{label}</code>
    </span>
  );
}
