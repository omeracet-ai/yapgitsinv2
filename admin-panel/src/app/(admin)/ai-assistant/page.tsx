"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { AdCard, AdButton, AdTextarea, AdSpinner, AdBadge } from "@/components/ad";
import { Send, Sparkles, Trash2, MessageSquare } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mode: string;
}

interface Mode {
  key: string;
  label: string;
  description: string;
}

export default function AiAssistantPage() {
  const [modes, setModes] = useState<Mode[]>([]);
  const [mode, setMode] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await api.saasAiModes();
        setModes(r.modes);
      } catch {
        // fall back to defaults
        setModes([{ key: "general", label: "Genel", description: "" }]);
      }
    })();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const newChat = () => {
    setMessages([]);
    setSessionId(undefined);
    setError(null);
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    const userMsg: ChatMessage = { role: "user", content: trimmed, mode };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    try {
      const r = await api.saasAiChat({ sessionId, mode, message: trimmed });
      setSessionId(r.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: r.reply, mode: r.mode }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
      // remove the user message on failure to allow retry
      setMessages((m) => m.slice(0, -1));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const currentMode = modes.find((m) => m.key === mode);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={22} /> AI Asistan
          </h1>
          <p style={{ fontSize: 13, color: "var(--ad-muted)", marginTop: 4 }}>
            Yapgitsin admin için Gemini 2.5 Flash tabanlı mod-bazlı asistan.
          </p>
        </div>
        <AdButton variant="secondary" onClick={newChat} disabled={messages.length === 0}>
          <Trash2 size={14} /> Yeni Sohbet
        </AdButton>
      </div>

      {/* Mode pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            title={m.description}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 999,
              border: mode === m.key ? "1px solid var(--ad-gold)" : "1px solid var(--ad-line-soft)",
              background: mode === m.key ? "var(--ad-gold)" : "transparent",
              color: mode === m.key ? "var(--ad-card)" : "var(--ad-ink)",
              cursor: "pointer",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {currentMode?.description && (
        <p style={{ fontSize: 12, color: "var(--ad-muted)", marginBottom: 12 }}>
          ℹ️ {currentMode.description}
        </p>
      )}

      {/* Messages */}
      <AdCard
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ad-muted)" }}>
              <div style={{ textAlign: "center" }}>
                <MessageSquare size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
                <p>Mod seçin ve sorunuzu yazın.</p>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: 16,
                  background: m.role === "user" ? "var(--ad-gold)" : "var(--ad-bg-elev, rgba(255,255,255,0.05))",
                  color: m.role === "user" ? "var(--ad-card)" : "var(--ad-ink)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  border: m.role === "assistant" ? "1px solid var(--ad-line-soft)" : "none",
                }}
              >
                {m.content}
                {m.role === "assistant" && (
                  <div style={{ marginTop: 6 }}>
                    <AdBadge variant="muted">{m.mode}</AdBadge>
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 16,
                  background: "var(--ad-bg-elev, rgba(255,255,255,0.05))",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid var(--ad-line-soft)",
                }}
              >
                <AdSpinner /> <span style={{ fontSize: 12, color: "var(--ad-muted)" }}>Yanıtlanıyor…</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: "8px 20px", color: "#ef4444", fontSize: 12, borderTop: "1px solid var(--ad-line-soft)" }}>
            Hata: {error}
          </div>
        )}

        {/* Input */}
        <div style={{ borderTop: "1px solid var(--ad-line-soft)", padding: 16, display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <AdTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`${currentMode?.label ?? "Genel"} modunda sorunuzu yazın…`}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={sending}
            />
          </div>
          <AdButton onClick={send} disabled={sending || !input.trim()}>
            <Send size={14} /> Gönder
          </AdButton>
        </div>
      </AdCard>
    </div>
  );
}
