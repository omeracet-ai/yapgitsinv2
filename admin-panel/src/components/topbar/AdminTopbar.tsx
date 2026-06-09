"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Search, Bot } from "lucide-react";
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
      <header
        className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 px-6 backdrop-blur-xl"
        style={{
          background: "rgba(22, 32, 43, 0.75)",
          borderBottom: "1px solid var(--ad-line-soft)",
        }}
      >
        {/* Title */}
        <h2
          className="truncate"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ad-ink)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>

        {/* Center — Cmd+K trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="group hidden flex-1 max-w-md items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm md:flex"
          style={{
            background: "var(--ad-elev)",
            border: "1px solid var(--ad-line)",
            color: "var(--ad-muted)",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <Search size={14} strokeWidth={1.8} />
          <span className="flex-1 truncate">Ara veya komut çalıştır…</span>
          <kbd
            className="rounded px-1.5 py-0.5"
            style={{
              border: "1px solid var(--ad-line)",
              background: "var(--ad-pop)",
              fontSize: 10,
              fontWeight: 500,
              color: "var(--ad-muted)",
            }}
          >
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          {/* Online indicator */}
          <div
            className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 sm:flex"
            style={{
              border: "1px solid rgba(34, 197, 94, 0.35)",
              background: "rgba(34, 197, 94, 0.14)",
              color: "var(--ad-success-tx)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
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
            className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
            style={{
              border: aiOpen
                ? "1px solid var(--ad-green-light)"
                : "1px solid var(--ad-line)",
              background: aiOpen ? "var(--ad-green-glow)" : "var(--ad-elev)",
              color: "var(--ad-ink)",
              transition: "all 0.15s",
            }}
            title="AI Asistan"
            aria-label="AI Asistan"
          >
            <Bot size={16} strokeWidth={1.8} />
          </button>

          {/* Locale switcher (TR/EN) */}
          <LocaleSwitcher />

          {/* Notifications */}
          <div style={{ color: "var(--ad-ink-dim)" }}>
            <NotificationBell />
          </div>

          {/* Admin label */}
          {adminLabel && (
            <span
              className="hidden sm:block"
              style={{ fontSize: 11, color: "var(--ad-muted)" }}
            >
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
