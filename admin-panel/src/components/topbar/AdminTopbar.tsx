"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { NotificationBell } from "@/components/NotificationBell";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { api } from "@/lib/api";

// M7 perf — Cmd+K modal and AI panel are rarely opened; keep them out of
// the initial admin bundle. ssr:false because both rely on browser-only APIs
// (keyboard focus, localStorage). Conditional mount (open state guards) means
// the chunk is fetched only on first open.
const CommandBar = dynamic(
  () => import("@/components/command-bar/CommandBar").then((m) => m.CommandBar),
  { ssr: false },
);
const AIAssistantPanel = dynamic(
  () =>
    import("@/components/ai-assistant/AIAssistantPanel").then(
      (m) => m.AIAssistantPanel,
    ),
  { ssr: false },
);

export function AdminTopbar({
  title,
  adminLabel,
}: {
  title: string;
  adminLabel?: string;
}) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [online, setOnline] = useState<number | null>(null);
  // Compute lazily during initial render — avoids setState-in-effect (React 19).
  const [isMac] = useState(() =>
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/i.test(navigator.platform),
  );

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Online users — best-effort: use providers count as proxy if no presence endpoint
  useEffect(() => {
    let alive = true;
    api
      .stats()
      .then((s) => {
        if (!alive) return;
        // Use verifiedProviders as a soft "active" proxy. Replace with real
        // presence endpoint when wired.
        setOnline(s.verifiedProviders ?? 0);
      })
      .catch(() => {
        if (alive) setOnline(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-900/70 px-6 backdrop-blur-xl">
        {/* Title */}
        <h1 className="truncate text-sm font-semibold text-white">{title}</h1>

        {/* Center — Cmd+K trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="group hidden flex-1 max-w-md items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-left text-sm text-slate-400 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-slate-200 md:flex"
        >
          <span>🔎</span>
          <span className="flex-1 truncate">Ara veya komut çalıştır…</span>
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 group-hover:text-slate-200">
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          {/* Online indicator */}
          <div
            className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 sm:flex"
            title="Aktif sağlayıcılar"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {online ?? "—"}
          </div>

          {/* AI Assistant toggle */}
          <button
            onClick={() => setAiOpen((v) => !v)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors ${
              aiOpen
                ? "border-blue-400/40 bg-blue-500/20 text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
            }`}
            title="AI Asistan"
            aria-label="AI Asistan"
          >
            🤖
          </button>

          {/* Locale switcher (TR/EN) */}
          <LocaleSwitcher />

          {/* Notifications */}
          <div className="text-slate-300">
            <NotificationBell />
          </div>

          {/* Admin label */}
          {adminLabel && (
            <span className="hidden text-xs text-slate-400 sm:block">
              {adminLabel}
            </span>
          )}
        </div>
      </header>

      {/* Mounted globally so keyboard shortcut works from anywhere.
          Key bump on open → fresh state each time (avoids effect-driven resets). */}
      {cmdOpen && (
        <CommandBar key={String(cmdOpen)} open={cmdOpen} onClose={() => setCmdOpen(false)} />
      )}
      {aiOpen && (
        <AIAssistantPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      )}
    </>
  );
}
