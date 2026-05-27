"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Result = {
  id: string;
  type: "user" | "job" | "category" | "action";
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
};

const QUICK_ACTIONS: Result[] = [
  { id: "a-dash", type: "action", title: "Dashboard", icon: "📊", href: "/dashboard" },
  { id: "a-apk-tasarim", type: "action", title: "APK Tasarım", icon: "🎨", href: "/apk-tasarim" },
  { id: "a-apk-icerik", type: "action", title: "APK İçerik", icon: "📦", href: "/apk-icerik" },
  { id: "a-apk-builder", type: "action", title: "APK Builder", icon: "🧩", href: "/apk-builder" },
  { id: "a-users", type: "action", title: "Kullanıcılar", icon: "👥", href: "/users" },
  { id: "a-jobs", type: "action", title: "Son İlanlar", icon: "📋", href: "/jobs" },
  { id: "a-broadcast", type: "action", title: "Duyuru Gönder", icon: "📢", href: "/broadcast" },
];

export function CommandBar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input on mount (parent re-keys on open so this fires fresh each time).
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Filter quick actions by query
  const quickFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return QUICK_ACTIONS;
    return QUICK_ACTIONS.filter((a) =>
      a.title.toLowerCase().includes(q),
    );
  }, [query]);

  // Debounced backend search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    let cancelled = false;
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const [users, jobs, cats] = await Promise.allSettled([
          api.getUsers({ search: q, limit: 5 }),
          api.getJobs({ search: q, limit: 5 }),
          api.categories(),
        ]);
        if (cancelled) return;
        const out: Result[] = [];
        if (users.status === "fulfilled") {
          for (const u of users.value.items) {
            out.push({
              id: `u-${u.id}`,
              type: "user",
              title: u.fullName || u.email,
              subtitle: u.email,
              icon: "👤",
              href: `/users?focus=${u.id}`,
            });
          }
        }
        if (jobs.status === "fulfilled") {
          for (const j of jobs.value.items) {
            out.push({
              id: `j-${j.id}`,
              type: "job",
              title: j.title,
              subtitle: j.category,
              icon: "📋",
              href: `/jobs?focus=${j.id}`,
            });
          }
        }
        if (cats.status === "fulfilled") {
          const ql = q.toLowerCase();
          for (const c of cats.value.filter((c) =>
            c.name.toLowerCase().includes(ql),
          ).slice(0, 5)) {
            out.push({
              id: `c-${c.id}`,
              type: "category",
              title: c.name,
              subtitle: "Kategori",
              icon: c.icon || "🏷️",
              href: `/categories?focus=${c.id}`,
            });
          }
        }
        setResults(out);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  const combined: Result[] = useMemo(() => {
    return [...quickFiltered, ...results];
  }, [quickFiltered, results]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, combined.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const r = combined[active];
        if (r) {
          e.preventDefault();
          router.push(r.href);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, combined, active, router, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/60 backdrop-blur-sm px-4 pt-[12vh] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-[0_0_0_1px_rgba(59,130,246,0.25),0_20px_60px_-20px_rgba(59,130,246,0.45)] backdrop-blur-xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="text-slate-400">🔎</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara: kullanıcı, ilan, kategori veya komut…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {loading && (
            <div className="px-3 py-2 text-xs text-slate-400 animate-pulse">
              Aranıyor…
            </div>
          )}

          {combined.length === 0 && !loading && (
            <div className="px-3 py-6 text-center text-sm text-slate-500">
              Sonuç yok
            </div>
          )}

          {quickFiltered.length > 0 && (
            <div className="mb-1 px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Hızlı Eylemler
            </div>
          )}
          {quickFiltered.map((r, i) => {
            const idx = i;
            return (
              <Row
                key={r.id}
                r={r}
                active={active === idx}
                onClick={() => {
                  router.push(r.href);
                  onClose();
                }}
                onHover={() => setActive(idx)}
              />
            );
          })}

          {results.length > 0 && (
            <div className="mb-1 mt-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Sonuçlar
            </div>
          )}
          {results.map((r, i) => {
            const idx = quickFiltered.length + i;
            return (
              <Row
                key={r.id}
                r={r}
                active={active === idx}
                onClick={() => {
                  router.push(r.href);
                  onClose();
                }}
                onHover={() => setActive(idx)}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/60 px-3 py-2 text-[10px] text-slate-500">
          <span>
            <kbd className="rounded border border-white/10 bg-white/5 px-1">↑↓</kbd> gez{" "}
            <kbd className="ml-1 rounded border border-white/10 bg-white/5 px-1">↵</kbd> aç
          </span>
          <span>Yapgitsin Komut Çubuğu</span>
        </div>
      </div>
    </div>
  );
}

function Row({
  r,
  active,
  onClick,
  onHover,
}: {
  r: Result;
  active: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active ? "bg-blue-600/25 text-white" : "text-slate-200 hover:bg-white/5"
      }`}
    >
      <span className="text-lg leading-none">{r.icon}</span>
      <span className="flex-1 truncate">
        <span className="block truncate font-medium">{r.title}</span>
        {r.subtitle && (
          <span className="block truncate text-xs text-slate-400">
            {r.subtitle}
          </span>
        )}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-slate-500">
        {r.type}
      </span>
    </button>
  );
}
