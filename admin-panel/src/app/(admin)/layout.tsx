"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, type AdminUser } from "@/lib/api";
import { NotificationBell } from "@/components/NotificationBell";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import { ToastProvider } from "@/components/ui/Toast";

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

const NAV = [
  { href: "/dashboard",  label: "Dashboard",     icon: "📊" },
  { href: "/workforce",  label: "Canlı İş Gücü",  icon: "⚡" },
  { href: "/jobs",       label: "Son İlanlar",    icon: "📋" },
  { href: "/categories", label: "Kategoriler",    icon: "🏷️" },
  { href: "/providers",  label: "Sağlayıcılar",   icon: "👷" },
  { href: "/users",      label: "Kullanıcılar",   icon: "👥" },
  { href: "/revenue",    label: "Gelir",          icon: "💰" },
  { href: "/onboarding-mgmt", label: "Onboarding",     icon: "🎯" },
  { href: "/promo-codes",     label: "Promo Kodlar",   icon: "🎟️" },
  { href: "/moderation",      label: "Moderasyon",     icon: "🛡️" },
  { href: "/reports",         label: "Şikayetler",     icon: "🚩" },
  { href: "/disputes",        label: "Anlaşmazlıklar", icon: "⚖️" },
  { href: "/certifications",  label: "Sertifikalar",   icon: "📜" },
  { href: "/audit-log",       label: "Denetim Kaydı",  icon: "📜" },
  { href: "/blog",            label: "Blog",           icon: "📝" },
  { href: "/broadcast",       label: "Duyuru Gönder",  icon: "📢" },
  { href: "/status",          label: "Sistem Durumu",  icon: "🩺" },
  { href: "/ayarlar",         label: "Ayarlar",        icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path   = usePathname();
  const router = useRouter();

  const [ready, setReady]     = useState(false);
  const [authed, setAuthed]   = useState(false);
  const [admin, setAdmin]     = useState<AdminUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token || !isTokenValid(token)) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      router.replace("/login");
      return;
    }
    try {
      const u = localStorage.getItem("admin_user");
      if (u) setAdmin(JSON.parse(u));
    } catch { /* ignore */ }
    setAuthed(true);
    setReady(true);
  }, [router]);

  const logout = async () => {
    await api.adminLogout().catch(() => { /* ignore — pairs with P191/2 backend */ });
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.replace("/login");
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Yükleniyor…</div>
      </div>
    );
  }
  if (!authed) return null;

  return (
    <ToastProvider>
      <ConfirmDialogProvider>
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-slate-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-slate-700">
          <span className="text-lg font-bold tracking-tight">🛠️ Yapgitsin</span>
          <p className="text-xs text-slate-400 mt-0.5">Yönetim Paneli</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Kullanıcı bilgisi + çıkış */}
        <div className="px-4 py-4 border-t border-slate-700">
          {admin && (
            <div className="mb-3 px-2">
              <p className="text-xs font-semibold text-white truncate">{admin.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{admin.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-red-900/50 hover:text-red-300 transition-colors"
          >
            <span>🚪</span>
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-sm font-semibold text-gray-700">
            {NAV.find(n => path === n.href || path.startsWith(n.href + "/"))?.label ?? "Panel"}
          </h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-xs text-gray-400">
              {admin ? `${admin.fullName} · admin` : ""}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
