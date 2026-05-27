"use client";

import { useEffect, useRef, useState } from "react";

type ChatMsg = { role: "user" | "assistant"; content: string };

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const WELCOME: ChatMsg = {
  role: "assistant",
  content:
    "Merhaba! Yapgitsin admin panelinde sana nasıl yardımcı olabilirim?",
};

export function AIAssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("admin_token")
          : null;
      const res = await fetch(`${BASE}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: messages
            .filter((m) => m !== WELCOME)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`AI ${res.status}`);
      const data = (await res.json()) as { reply?: string };
      setMessages([
        ...next,
        { role: "assistant", content: data.reply ?? "(boş yanıt)" },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI hatası";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col border-l border-white/10 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h2 className="text-sm font-semibold">AI Asistan</h2>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              Gemini Flash
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
          >
            ✕
          </button>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-slate-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-slate-300">
                <span className="inline-block animate-pulse">Düşünüyor…</span>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        <footer className="border-t border-white/10 bg-slate-950/60 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Mesaj yaz… (Enter gönder, Shift+Enter satır)"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              Gönder
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
