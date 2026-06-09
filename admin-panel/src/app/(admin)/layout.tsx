"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, refreshAdminToken, type AdminUser } from "@/lib/api";
import { AdminTopbar } from "@/components/topbar/AdminTopbar";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import { ToastProvider } from "@/components/ui/Toast";
import { AnimatedGrid } from "@/components/animated-bg/AnimatedGrid";

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operasyon",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "📊" },
      { href: "/realtime-analytics", label: "Realtime", icon: "📈" },
      { href: "/workforce", label: "Canlı İş Gücü", icon: "⚡" },
      { href: "/jobs", label: "Son İlanlar", icon: "📋" },
      { href: "/analytics", label: "Analytics", icon: "📊" },
    ],
  },
  {
    title: "Kullanıcılar",
    items: [
      { href: "/users", label: "Kullanıcılar", icon: "👥" },
      { href: "/providers", label: "Sağlayıcılar", icon: "👷" },
      { href: "/certifications", label: "Sertifikalar", icon: "📜" },
    ],
  },
  {
    title: "İçerik",
    items: [
      { href: "/categories", label: "Kategoriler", icon: "🏷️" },
      { href: "/promo-codes", label: "Promo Kodlar", icon: "🎟️" },
      { href: "/onboarding-mgmt", label: "Onboarding", icon: "🎯" },
      { href: "/broadcast", label: "Duyuru Gönder", icon: "📢" },
    ],
  },
  {
    title: "Para",
    items: [
      { href: "/revenue", label: "Gelir", icon: "💰" },
      { href: "/crypto-deposits", label: "USDT Yatırım", icon: "₿" },
    ],
  },
  {
    title: "Moderasyon",
    items: [
      { href: "/moderation", label: "Moderasyon", icon: "🛡️" },
      { href: "/reports", label: "Şikayetler", icon: "🚩" },
      { href: "/disputes", label: "Anlaşmazlıklar", icon: "⚖️" },
      { href: "/audit-log", label: "Denetim Kaydı", icon: "📜" },
      { href: "/blocked-ips", label: "Engellenen IP", icon: "🛡️" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/status", label: "Sistem Durumu", icon: "🩺" },
      { href: "/escrow-settings", label: "Escrow Ayarları", icon: "🔐" },
      { href: "/harita", label: "Harita Yönetimi", icon: "🗺️" },
      { href: "/ayarlar", label: "Ayarlar", icon: "⚙️" },
    ],
  },
  {
    title: "APK",
    items: [
      { href: "/apk-icerik", label: "APK Yönetim", icon: "📱" },
      { href: "/apk-builder", label: "APK Builder", icon: "🧩" },
      { href: "/apk-tasarim", label: "APK Tasarım", icon: "🎨" },
      { href: "/profile-card", label: "Profile Card", icon: "🪪" },
    ],
  },
];

const ALL_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem("admin_token");
      let valid = !!token && isTokenValid(token);
      if (!valid) valid = await refreshAdminToken();
      if (cancelled) return;
      if (!valid) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_refresh_token");
        localStorage.removeItem("admin_user");
        router.replace("/login");
        return;
      }
      try {
        const u = localStorage.getItem("admin_user");
        if (u) setAdmin(JSON.parse(u));
      } catch {
        /* ignore */
      }
      setAuthed(true);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Close mobile drawer on path change
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  const logout = async () => {
    await api.adminLogout().catch(() => {
      /* ignore */
    });
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_refresh_token");
    localStorage.removeItem("admin_user");
    router.replace("/login");
  };

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ad-bg)" }}
      >
        <div
          className="text-sm animate-pulse"
          style={{ color: "var(--ad-muted)" }}
        >
          Yükleniyor…
        </div>
      </div>
    );
  }
  if (!authed) return null;

  const activeNav = ALL_NAV.find(
    (n) => path === n.href || path.startsWith(n.href + "/"),
  );

  const renderNavGroup = (group: NavGroup) => {
    const hasActive = group.items.some(
      (it) => path === it.href || path.startsWith(it.href + "/"),
    );
    return (
      <details
        key={group.title}
        open={hasActive}
        className="ad-nav-group"
      >
        <summary className="ad-nav-group-title cursor-pointer list-none flex items-center justify-between">
          <span>{group.title}</span>
          <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
        </summary>
        <div className="space-y-0.5 pt-1">
          {group.items.map((it) => {
            const active =
              path === it.href || path.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`ad-nav-link ${active ? "active" : ""}`}
                style={{ textDecoration: "none" }}
              >
                <span style={{ width: 18, display: "inline-flex", justifyContent: "center" }}>
                  {it.icon}
                </span>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
      </details>
    );
  };

  const sidebarInner = (
    <>
      {/* Brand */}
      <div
        style={{
          padding: "20px 18px 18px",
          borderBottom: "1px solid var(--ad-line-soft)",
        }}
      >
        <h1
          style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          Yapgitsin Yönetim
        </h1>
        <p
          style={{
            fontSize: 11,
            color: "var(--ad-muted)",
            marginTop: 4,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Admin Paneli
        </p>
      </div>

      {/* Nav scroll */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 10px 16px",
        }}
      >
        {NAV_GROUPS.map(renderNavGroup)}
      </nav>

      {/* Foot */}
      <div
        style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--ad-line-soft)",
        }}
      >
        {admin && (
          <div style={{ marginBottom: 10 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ad-ink)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {admin.fullName}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--ad-muted)",
                margin: "2px 0 0",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {admin.email}
            </p>
          </div>
        )}
        <button
          onClick={logout}
          className="ad-btn ad-btn-secondary ad-btn-sm"
          style={{ width: "100%", justifyContent: "center" }}
        >
          🚪 Çıkış Yap
        </button>
      </div>
    </>
  );

  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <AnimatedGrid />

        {/* Mobile topbar */}
        <div className="ad-mobile-topbar">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
            style={{
              width: 44,
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--ad-line-soft)",
              borderRadius: 8,
              color: "var(--ad-ink)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ☰
          </button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {activeNav?.label ?? "Panel"}
          </span>
          <button
            onClick={logout}
            aria-label="Çıkış"
            style={{
              width: 44,
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--ad-line-soft)",
              borderRadius: 8,
              color: "var(--ad-ink)",
              cursor: "pointer",
            }}
          >
            ⎋
          </button>
        </div>

        {/* Sidebar — desktop fixed */}
        <aside className={`ad-sidebar ${mobileOpen ? "is-open" : ""}`}>
          {sidebarInner}
        </aside>

        {/* Backdrop for mobile drawer */}
        {mobileOpen && (
          <div
            className="ad-sidebar-backdrop"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Content */}
        <div className="ad-content-wrap">
          <AdminTopbar
            title={activeNav?.label ?? "Panel"}
            adminLabel={admin ? `${admin.fullName} · admin` : undefined}
          />
          <main className="ad-main">{children}</main>
        </div>

        {/* Layout-scoped styles */}
        <style jsx global>{`
          html,
          body {
            background: var(--ad-bg);
            color: var(--ad-ink);
          }
          .ad-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: 220px;
            display: flex;
            flex-direction: column;
            background: linear-gradient(180deg, #131b25 0%, #0f161f 100%);
            border-right: 1px solid var(--ad-line-soft);
            box-shadow: var(--ad-shadow-md);
            z-index: 40;
            transition: transform 0.3s var(--ad-ease-soft);
          }
          .ad-content-wrap {
            margin-left: 220px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .ad-main {
            flex: 1;
            padding: 24px 32px;
            max-width: 1600px;
            width: 100%;
            margin: 0 auto;
            box-sizing: border-box;
          }
          .ad-mobile-topbar {
            display: none;
          }
          .ad-sidebar-backdrop {
            display: none;
          }
          .ad-nav-group summary::-webkit-details-marker {
            display: none;
          }
          .ad-nav-group[open] > summary > span:last-child {
            transform: rotate(180deg);
            transition: transform 0.2s;
          }
          @media (max-width: 1024px) {
            .ad-sidebar { width: 200px; }
            .ad-content-wrap { margin-left: 200px; }
            .ad-main { padding: 20px 24px; }
          }
          @media (max-width: 760px) {
            .ad-sidebar {
              width: 80vw;
              max-width: 320px;
              transform: translateX(-100%);
            }
            .ad-sidebar.is-open {
              transform: translateX(0);
            }
            .ad-content-wrap {
              margin-left: 0;
              padding-top: 60px;
            }
            .ad-main {
              padding: 16px 14px 80px;
            }
            .ad-mobile-topbar {
              display: flex;
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 60px;
              padding: 0 14px;
              background: var(--ad-card);
              border-bottom: 1px solid var(--ad-line-soft);
              align-items: center;
              justify-content: space-between;
              z-index: 30;
            }
            .ad-sidebar-backdrop {
              display: block;
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.5);
              backdrop-filter: blur(4px);
              z-index: 35;
            }
          }
        `}</style>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
