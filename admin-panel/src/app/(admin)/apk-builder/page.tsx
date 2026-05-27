"use client";

/**
 * Live APK Visual Builder — Phase 270 (Voldi-fs+design).
 *
 * Two-column layout:
 *   • Left  (60%) — 3D phone mockup rendering the SELECTED screen's items.
 *                   Tapping a sample element selects it for inline editing.
 *   • Right (40%) — Inline editor: type, props (JSON), reorder, save.
 *
 * Backend contract (Phase 269):
 *   GET  /admin/app-config          → AdminAppConfig (includes layouts[])
 *   PUT  /admin/app-config/layout   → { screen, items[] }
 *
 * Pure Tailwind + inline-style. No extra deps.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  api,
  type AppConfigLayout,
  type AppConfigLayoutItem,
  type AppConfigThemeTokens,
} from "@/lib/api";

// M7 perf — PhoneFrame3D ships its own 3D CSS perspective tree; lazy with a
// lightweight placeholder so the builder shell paints fast.
const PhoneFrame3D = dynamic(
  () =>
    import("@/components/apk-preview/PhoneFrame3D").then((m) => m.PhoneFrame3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm">
        Önizleme yükleniyor…
      </div>
    ),
  },
);
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SCREENS = [
  { key: "main_shell", label: "Ana Kabuk (Tab Bar)" },
  { key: "profile",    label: "Profil" },
  { key: "job_detail", label: "İlan Detayı" },
  { key: "settings",   label: "Ayarlar" },
];

const COMPONENT_TYPES = ["button", "tab", "card", "label", "section", "menu", "popup", "table", "text", "icon"];

/** Default props template per element type — fills sensible starter values
 * when the user clicks the "+ Add element" dropdown. */
const TYPE_DEFAULTS: Record<string, Record<string, unknown>> = {
  button:  { type: "button", label: "Buton",   icon: "▶️", color: "" },
  tab:     { type: "tab",    label: "Sekme",   icon: "▫️" },
  card:    { type: "card",   label: "Kart",    icon: "🟦" },
  label:   { type: "label",  label: "Etiket" },
  section: { type: "section",label: "Bölüm",   icon: "📂" },
  menu:    { type: "menu",   label: "Menü",    icon: "≡" },
  popup:   { type: "popup",  label: "Popup",   icon: "💬", content: "İçerik" },
  table:   { type: "table",  label: "Tablo",   icon: "▦" },
  text:    { type: "text",   label: "Metin" },
  icon:    { type: "icon",   label: "İkon",    icon: "★" },
};

interface HistoryEntry {
  ts: number;
  summary: string;
  snapshot: AppConfigLayoutItem[];
}

const FALLBACK_THEME: AppConfigThemeTokens = {
  primary: "#FF5A1F",
  surface: "#FFFFFF",
  text: "#1F2937",
  radius: 16,
  font: "Inter",
};

interface EditableItem extends AppConfigLayoutItem {
  /** Stable index for selection — items[] has no id; key may repeat across types. */
  _idx: number;
  /** Stable id for dnd-kit — survives reorder; never reused after deletion. */
  _dndId: string;
}

let _dndCounter = 0;
function nextDndId(): string {
  _dndCounter += 1;
  return `dnd-${_dndCounter}-${Date.now().toString(36)}`;
}

function deriveType(it: AppConfigLayoutItem): string {
  const t = (it.props?.type as string | undefined) ?? "";
  if (t) return t;
  // key heuristics: "tab_X", "card_X" → "tab" / "card"
  const head = String(it.key ?? "").split(/[_-]/)[0]?.toLowerCase();
  if (head && COMPONENT_TYPES.includes(head)) return head;
  return "text";
}

function readLabel(it: AppConfigLayoutItem): string {
  return (
    (it.props?.label as string | undefined) ??
    (it.props?.title as string | undefined) ??
    (it.props?.text as string | undefined) ??
    it.key
  );
}

function readIcon(it: AppConfigLayoutItem): string | null {
  return (it.props?.icon as string | undefined) ?? null;
}

function readColor(it: AppConfigLayoutItem, fallback: string): string {
  return (it.props?.color as string | undefined) ?? fallback;
}

export default function ApkBuilderPage() {
  const [screen, setScreen] = useState<string>(SCREENS[0].key);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [theme, setTheme] = useState<AppConfigThemeTokens>(FALLBACK_THEME);
  const [appTitle, setAppTitle] = useState("Yapgitsin");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // ── Brief gap-fill state ─────────────────────────────────────────────────
  /** Undo/redo stacks store layout snapshots (without _idx/_dndId). */
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  /** History panel — last N edits with revert support. */
  const [historyPanel, setHistoryPanel] = useState<HistoryEntry[]>([]);
  /** Locked items can't be edited/moved/deleted — stored as `_dndId` set. */
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  /** Zoom level for phone mockup (0.5 – 1.5). */
  const [zoom, setZoom] = useState(1);
  /** Autosave debounce ref so rapid edits collapse into one PUT. */
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Suppress autosave during initial load / undo apply. */
  const suppressAutosaveRef = useRef(false);
  /** Right drawer toggle for selected element details. */
  const [drawerOpen, setDrawerOpen] = useState(true);

  /**
   * Push a snapshot to undo stack + record in history panel.
   * Always called BEFORE mutating items, so the previous state is recoverable.
   */
  const pushHistory = useCallback((summary: string, prev: EditableItem[]) => {
    const snapshot = prev.map(({ _idx: _a, _dndId: _b, ...rest }) => { void _a; void _b; return rest; });
    const entry: HistoryEntry = { ts: Date.now(), summary, snapshot };
    setUndoStack((s) => [...s.slice(-49), entry]);
    setRedoStack([]);
    setHistoryPanel((p) => [entry, ...p].slice(0, 10));
  }, []);

  // Load admin config (full state) + filter to the active screen layout.
  const refresh = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const cfg = await api.getAdminAppConfig();
      const activeTheme = cfg.themes?.find((t) => t.isActive) ?? cfg.themes?.[0];
      if (activeTheme) setTheme({ ...FALLBACK_THEME, ...activeTheme.tokens });
      if (cfg.branding?.appTitle) setAppTitle(cfg.branding.appTitle);

      const layout: AppConfigLayout | undefined = (cfg.layouts ?? []).find(
        (l) => l.screen === screen,
      );
      const next = (layout?.items ?? []).map<EditableItem>((it, idx) => ({
        ...it,
        _idx: idx,
        _dndId: nextDndId(),
      }));
      suppressAutosaveRef.current = true;
      setItems(next);
      setSelectedIdx(next.length > 0 ? 0 : null);
      setUndoStack([]);
      setRedoStack([]);
    } catch (e) {
      setMsg({ kind: "err", text: `Yüklenemedi: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  }, [screen]);

  useEffect(() => {
    // Defer the setState-bearing fetch out of the effect body to satisfy
    // react-hooks/set-state-in-effect (same pattern as ApkPreviewModal).
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  // ── Autosave (debounced 2s) ──────────────────────────────────────────────
  useEffect(() => {
    if (suppressAutosaveRef.current) {
      // First load or undo apply — skip this cycle, re-enable after.
      const id = setTimeout(() => { suppressAutosaveRef.current = false; }, 0);
      return () => clearTimeout(id);
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const payload: AppConfigLayoutItem[] = items.map(
            ({ _idx: _a, _dndId: _b, ...rest }) => { void _a; void _b; return rest; },
          );
          await api.putLayout(screen, payload);
          setMsg({ kind: "ok", text: "Otomatik kaydedildi ✓" });
        } catch (e) {
          setMsg({ kind: "err", text: `Autosave: ${(e as Error).message}` });
        }
      })();
    }, 2000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [items, screen]);

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const top = stack[stack.length - 1];
      const current: HistoryEntry = {
        ts: Date.now(),
        summary: "current",
        snapshot: items.map(({ _idx: _a, _dndId: _b, ...rest }) => { void _a; void _b; return rest; }),
      };
      setRedoStack((r) => [...r, current]);
      suppressAutosaveRef.current = true;
      setItems(top.snapshot.map((it, i) => ({ ...it, _idx: i, _dndId: nextDndId() })));
      return stack.slice(0, -1);
    });
  }, [items]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const top = stack[stack.length - 1];
      const current: HistoryEntry = {
        ts: Date.now(),
        summary: "current",
        snapshot: items.map(({ _idx: _a, _dndId: _b, ...rest }) => { void _a; void _b; return rest; }),
      };
      setUndoStack((u) => [...u, current]);
      suppressAutosaveRef.current = true;
      setItems(top.snapshot.map((it, i) => ({ ...it, _idx: i, _dndId: nextDndId() })));
      return stack.slice(0, -1);
    });
  }, [items]);

  // Keyboard shortcuts Ctrl+Z / Ctrl+Y (or Cmd on mac).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (key === "y" || (key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const revertTo = (entry: HistoryEntry) => {
    pushHistory("revert", items);
    suppressAutosaveRef.current = false;
    setItems(entry.snapshot.map((it, i) => ({ ...it, _idx: i, _dndId: nextDndId() })));
  };

  const toggleLock = (dndId: string) => {
    setLockedIds((s) => {
      const n = new Set(s);
      if (n.has(dndId)) n.delete(dndId); else n.add(dndId);
      return n;
    });
  };

  const selected = useMemo(
    () => (selectedIdx !== null ? items[selectedIdx] : null),
    [items, selectedIdx],
  );
  const selectedLocked = selected ? lockedIds.has(selected._dndId) : false;

  const updateSelected = (mut: (it: EditableItem) => EditableItem) => {
    if (selectedIdx === null) return;
    if (selectedLocked) { setMsg({ kind: "err", text: "Bu öğe kilitli." }); return; }
    pushHistory("edit", items);
    setItems((prev) => prev.map((it, i) => (i === selectedIdx ? mut(it) : it)));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    if (lockedIds.has(items[idx]._dndId)) { setMsg({ kind: "err", text: "Bu öğe kilitli." }); return; }
    pushHistory("move", items);
    setItems((prev) => {
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy.map((it, i) => ({ ...it, _idx: i }));
    });
    setSelectedIdx(target);
  };

  // ─── dnd-kit ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    if (lockedIds.has(String(active.id))) { setMsg({ kind: "err", text: "Bu öğe kilitli." }); return; }
    pushHistory("reorder", items);
    setItems((prev) => {
      const from = prev.findIndex((it) => it._dndId === active.id);
      const to = prev.findIndex((it) => it._dndId === over.id);
      if (from < 0 || to < 0) return prev;
      const moved = arrayMove(prev, from, to).map((it, i) => ({ ...it, _idx: i }));
      // Keep selection following the dragged item.
      setSelectedIdx(to);
      return moved;
    });
  };

  const addItem = (typeKey: string = "card") => {
    pushHistory("add", items);
    const tmpl = TYPE_DEFAULTS[typeKey] ?? TYPE_DEFAULTS.card;
    const newItem: EditableItem = {
      key: `${typeKey}_${Date.now()}`,
      visible: true,
      props: { ...tmpl },
      _idx: items.length,
      _dndId: nextDndId(),
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedIdx(items.length);
  };

  const removeSelected = () => {
    if (selectedIdx === null) return;
    if (selectedLocked) { setMsg({ kind: "err", text: "Bu öğe kilitli." }); return; }
    pushHistory("remove", items);
    setItems((prev) => prev.filter((_, i) => i !== selectedIdx).map((it, i) => ({ ...it, _idx: i })));
    setSelectedIdx(null);
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload: AppConfigLayoutItem[] = items.map(
        ({ _idx: _drop, _dndId: _drop2, ...rest }) => {
          void _drop;
          void _drop2;
          return rest;
        },
      );
      await api.putLayout(screen, payload);
      setMsg({ kind: "ok", text: "Kaydedildi ✓ — APK bir sonraki açılışta yeni düzeni alacak." });
      // touch local copy ref-stable so any re-fetch picks up the saved order
    } catch (e) {
      setMsg({ kind: "err", text: `Kaydedilemedi: ${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const primary = String(theme.primary ?? "#FF5A1F");
  const surface = String(theme.surface ?? "#FFFFFF");
  const text = String(theme.text ?? "#1F2937");
  const radius = Number(theme.radius ?? 16);

  return (
    <div className="min-h-full">
      {/* Animated gradient bg + page header */}
      <div className="relative -m-6 mb-6 p-6 overflow-hidden border-b border-slate-200/60">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, #ff5a1f33, transparent 40%), radial-gradient(circle at 80% 30%, #2d3e5033, transparent 40%), radial-gradient(circle at 60% 80%, #ffb40033, transparent 40%)",
          }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              🧩 APK Visual Builder
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Mobil uygulamadaki ekran düzenlerini canlı önizleme ile düzenle.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Undo / Redo */}
            <div className="flex items-center gap-1 bg-white/70 backdrop-blur-md border border-white/40 rounded-lg shadow-sm px-1.5 py-1">
              <button onClick={undo} disabled={undoStack.length === 0}
                className="px-2 py-1 text-sm font-bold text-slate-700 hover:bg-white rounded disabled:opacity-30"
                title="Geri al (Ctrl+Z)">↶</button>
              <button onClick={redo} disabled={redoStack.length === 0}
                className="px-2 py-1 text-sm font-bold text-slate-700 hover:bg-white rounded disabled:opacity-30"
                title="Yinele (Ctrl+Y)">↷</button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1.5 bg-white/70 backdrop-blur-md border border-white/40 rounded-lg shadow-sm px-2 py-1">
              <span className="text-xs text-slate-600">🔍</span>
              <input type="range" min={50} max={150} value={Math.round(zoom * 100)}
                onChange={(e) => setZoom(Number(e.target.value) / 100)}
                className="w-20 accent-orange-500" title="Zoom" />
              <span className="text-xs font-mono text-slate-600 w-10">{Math.round(zoom * 100)}%</span>
            </div>

            <select value={screen} onChange={(e) => setScreen(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/70 backdrop-blur-md border border-white/40 text-sm font-medium shadow-sm hover:bg-white transition">
              {SCREENS.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
            </select>

            <button onClick={() => void refresh()} disabled={loading}
              className="px-3 py-2 rounded-lg bg-white/70 backdrop-blur-md border border-white/40 text-sm font-medium shadow-sm hover:bg-white transition disabled:opacity-50">
              {loading ? "Yenileniyor…" : "↻ Yenile"}
            </button>
            <button onClick={() => void save()} disabled={saving || loading}
              className="px-4 py-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50">
              {saving ? "Kaydediliyor…" : "💾 Kaydet"}
            </button>
          </div>
        </div>
        {msg && (
          <div
            className={`relative mt-3 px-3 py-2 rounded-lg text-sm font-medium ${
              msg.kind === "ok"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Phone mockup (60% ≈ 3/5) — interactive 3D rotate */}
        <div className="lg:col-span-3 flex items-start justify-center">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 200ms ease" }}>
          <PhoneFrame3D
            width={360}
            height={780}
            bezelRadius={56}
            bezelPadding={12}
            bezelClassName="bg-slate-800 shadow-2xl shadow-black/40"
          >
              <div
                className="w-full h-full overflow-hidden relative flex flex-col"
                style={{
                  borderRadius: 44,
                  background: surface,
                  color: text,
                  fontFamily: String(theme.font ?? "Inter") + ", system-ui, sans-serif",
                }}
              >
                {/* Status bar */}
                <div
                  className="flex items-center justify-between px-7 pt-3 pb-1 text-[11px] font-semibold"
                  style={{ color: text }}
                >
                  <span>09:41</span>
                  <span>•••</span>
                  <span>100%</span>
                </div>

                {/* Header */}
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ borderBottom: `1px solid ${text}15` }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: primary }}
                  >
                    {appTitle.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold leading-tight">{appTitle}</div>
                    <div className="text-[10px] opacity-60">
                      {SCREENS.find((s) => s.key === screen)?.label ?? screen}
                    </div>
                  </div>
                </div>

                {/* Body — render layout items as tappable cards */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  {items.length === 0 && (
                    <div
                      className="text-center text-xs opacity-50 py-12 border-2 border-dashed rounded-xl"
                      style={{ borderColor: `${text}30` }}
                    >
                      Bu ekranda henüz öğe yok.
                      <br />
                      Sağ panelden ekle.
                    </div>
                  )}
                  {items.map((it, idx) => {
                    const t = deriveType(it);
                    const label = readLabel(it);
                    const icon = readIcon(it);
                    const color = readColor(it, primary);
                    const isSel = idx === selectedIdx;
                    const dim = it.visible === false;

                    const baseStyle: React.CSSProperties = {
                      borderRadius: radius,
                      borderColor: isSel ? color : `${text}15`,
                      borderWidth: isSel ? 2 : 1,
                      borderStyle: "solid",
                      opacity: dim ? 0.4 : 1,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    };

                    if (t === "tab") {
                      return (
                        <button
                          key={`${it.key}-${idx}`}
                          onClick={() => setSelectedIdx(idx)}
                          className="w-full flex items-center gap-2 px-3 py-2.5"
                          style={{ ...baseStyle, background: isSel ? `${color}15` : `${text}05` }}
                        >
                          <span className="text-lg">{icon ?? "▫️"}</span>
                          <span className="text-sm font-semibold" style={{ color }}>
                            {label}
                          </span>
                          <span className="ml-auto text-[10px] opacity-50 uppercase">tab</span>
                        </button>
                      );
                    }
                    if (t === "button") {
                      return (
                        <button
                          key={`${it.key}-${idx}`}
                          onClick={() => setSelectedIdx(idx)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-white text-sm font-bold"
                          style={{
                            ...baseStyle,
                            background: color,
                            borderColor: isSel ? text : color,
                          }}
                        >
                          {icon && <span>{icon}</span>}
                          {label}
                        </button>
                      );
                    }
                    if (t === "text" || t === "label") {
                      return (
                        <div
                          key={`${it.key}-${idx}`}
                          onClick={() => setSelectedIdx(idx)}
                          className="px-3 py-2 text-sm"
                          style={{ ...baseStyle, background: `${text}05`, color: text }}
                        >
                          {icon && <span className="mr-1">{icon}</span>}
                          {label}
                        </div>
                      );
                    }
                    if (t === "section") {
                      return (
                        <div
                          key={`${it.key}-${idx}`}
                          onClick={() => setSelectedIdx(idx)}
                          className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider"
                          style={{ ...baseStyle, background: `${color}10`, color }}
                        >
                          {icon && <span className="mr-1">{icon}</span>}
                          {label}
                        </div>
                      );
                    }
                    // default → card
                    return (
                      <div
                        key={`${it.key}-${idx}`}
                        onClick={() => setSelectedIdx(idx)}
                        className="p-3"
                        style={{ ...baseStyle, background: surface }}
                      >
                        <div className="flex items-center gap-2">
                          {icon && (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                              style={{ background: `${color}15`, color }}
                            >
                              {icon}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate" style={{ color: text }}>
                              {label}
                            </div>
                            <div className="text-[10px] opacity-60 truncate">{it.key}</div>
                          </div>
                          <span className="text-[10px] opacity-50 uppercase">{t}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
          </PhoneFrame3D>
          </div>
        </div>

        {/* RIGHT — Inline editor (40% ≈ 2/5) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Item list / reorder panel */}
          <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-lg p-4 hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-sm font-bold text-slate-900">Öğeler ({items.length})</h2>
              <select
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  addItem(v);
                  e.currentTarget.value = "";
                }}
                defaultValue=""
                className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold hover:bg-emerald-200 transition border border-emerald-200 cursor-pointer"
                title="Yeni öğe ekle"
              >
                <option value="" disabled>＋ Ekle…</option>
                {COMPONENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Liste boş.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext
                  items={items.map((it) => it._dndId)}
                  strategy={verticalListSortingStrategy}
                >
                  <ol className="space-y-1">
                    {items.map((it, idx) => (
                      <SortableBuilderItem
                        key={it._dndId}
                        id={it._dndId}
                        idx={idx}
                        total={items.length}
                        label={readLabel(it)}
                        type={deriveType(it)}
                        visible={it.visible !== false}
                        locked={lockedIds.has(it._dndId)}
                        selected={idx === selectedIdx}
                        onSelect={() => setSelectedIdx(idx)}
                        onToggleLock={() => toggleLock(it._dndId)}
                        onMoveUp={() => move(idx, -1)}
                        onMoveDown={() => move(idx, 1)}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Selected element editor */}
          <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-lg p-4 hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Seçili Öğe Detayı</h2>
              <button onClick={() => setDrawerOpen((v) => !v)}
                className="text-xs text-slate-500 hover:text-slate-900"
                title={drawerOpen ? "Daralt" : "Genişlet"}>
                {drawerOpen ? "▾" : "▸"}
              </button>
            </div>
            {drawerOpen && selected && selectedLocked && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                🔒 Bu öğe kilitli — düzenlemek için soldan kilidi aç.
              </div>
            )}
            {drawerOpen && !selected && (
              <p className="text-xs text-slate-500 italic">
                Soldaki telefonda bir öğe seç ya da listeye ekle.
              </p>
            )}
            {drawerOpen && selected && (
              <div className="space-y-3">
                <Field label="Key">
                  <input
                    type="text"
                    value={selected.key}
                    onChange={(e) =>
                      updateSelected((it) => ({ ...it, key: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-orange-300 outline-none"
                  />
                </Field>
                <Field label="Component Type">
                  <select
                    value={deriveType(selected)}
                    onChange={(e) =>
                      updateSelected((it) => ({
                        ...it,
                        props: { ...(it.props ?? {}), type: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
                  >
                    {COMPONENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Label / Title">
                  <input
                    type="text"
                    value={(selected.props?.label as string | undefined) ?? ""}
                    onChange={(e) =>
                      updateSelected((it) => ({
                        ...it,
                        props: { ...(it.props ?? {}), label: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Icon (emoji)">
                    <input
                      type="text"
                      value={(selected.props?.icon as string | undefined) ?? ""}
                      onChange={(e) =>
                        updateSelected((it) => ({
                          ...it,
                          props: { ...(it.props ?? {}), icon: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
                    />
                  </Field>
                  <Field label="Color (hex)">
                    <input
                      type="text"
                      value={(selected.props?.color as string | undefined) ?? ""}
                      placeholder={primary}
                      onChange={(e) =>
                        updateSelected((it) => ({
                          ...it,
                          props: { ...(it.props ?? {}), color: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-orange-300 outline-none"
                    />
                  </Field>
                </div>
                <Field label="Görünür">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.visible !== false}
                      onChange={(e) =>
                        updateSelected((it) => ({ ...it, visible: e.target.checked }))
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-slate-700">Bu öğe APK&apos;da gösterilsin</span>
                  </label>
                </Field>
                <Field label="Props (JSON, ileri seviye)">
                  <PropsJsonEditor
                    value={selected.props ?? {}}
                    onChange={(next) => updateSelected((it) => ({ ...it, props: next }))}
                  />
                </Field>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => selectedIdx !== null && move(selectedIdx, -1)}
                      disabled={selectedIdx === 0}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 disabled:opacity-40 transition"
                    >
                      ↑ Yukarı
                    </button>
                    <button
                      onClick={() => selectedIdx !== null && move(selectedIdx, 1)}
                      disabled={selectedIdx === null || selectedIdx === items.length - 1}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 disabled:opacity-40 transition"
                    >
                      ↓ Aşağı
                    </button>
                  </div>
                  <button
                    onClick={removeSelected}
                    className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition"
                  >
                    🗑 Sil
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* History panel — last 10 edits with revert */}
          <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-lg p-4 hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">🕐 Geçmiş ({historyPanel.length})</h2>
              <div className="text-[10px] text-slate-500">
                Undo: {undoStack.length} · Redo: {redoStack.length}
              </div>
            </div>
            {historyPanel.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Henüz değişiklik yok.</p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {historyPanel.map((h) => {
                  const labels: Record<string, string> = {
                    edit: "✎ düzenle", move: "↕ taşı", reorder: "↕↕ sırala",
                    add: "＋ ekle", remove: "🗑 sil", revert: "↺ geri al",
                  };
                  return (
                    <li key={h.ts} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-slate-100 text-xs">
                      <span className="text-slate-700 truncate flex-1">
                        {labels[h.summary] ?? h.summary} <span className="text-slate-400 ml-1">({h.snapshot.length} öğe)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(h.ts).toLocaleTimeString("tr-TR")}</span>
                      <button onClick={() => revertTo(h)} className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold hover:bg-amber-200">↺</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One draggable row in the item list. Drag handle is the leading ⋮⋮ glyph;
 * the rest of the row stays clickable for selection. Up/down arrow buttons
 * remain for keyboard accessibility (dnd-kit keyboard sensor also works on
 * the handle itself).
 */
function SortableBuilderItem({
  id, idx, total, label, type, visible, locked, selected,
  onSelect, onToggleLock, onMoveUp, onMoveDown,
}: {
  id: string;
  idx: number;
  total: number;
  label: string;
  type: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggleLock: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition ${
        selected
          ? "bg-orange-100 text-orange-900 ring-1 ring-orange-300"
          : "hover:bg-slate-100 text-slate-700"
      } ${isDragging ? "shadow-lg bg-white" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 px-1 select-none"
        aria-label="Sürükle"
        title="Sürükleyerek sırala"
      >
        ⋮⋮
      </button>
      <span className="font-mono text-slate-400 w-5 text-right">{idx + 1}.</span>
      <span className="flex-1 truncate font-medium">{label}</span>
      <span className="text-[10px] uppercase text-slate-500">{type}</span>
      {!visible && <span title="gizli">👁️‍🗨️</span>}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
        className={`w-6 h-6 rounded text-xs ${locked ? "bg-amber-200 text-amber-800" : "hover:bg-white text-slate-400"}`}
        aria-label={locked ? "Kilidi aç" : "Kilitle"}
        title={locked ? "Kilitli — düzenlenemez" : "Kilitle"}
      >
        {locked ? "🔒" : "🔓"}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMoveUp();
        }}
        disabled={idx === 0}
        className="w-6 h-6 rounded hover:bg-white disabled:opacity-30"
        aria-label="Yukarı"
      >
        ↑
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMoveDown();
        }}
        disabled={idx === total - 1}
        className="w-6 h-6 rounded hover:bg-white disabled:opacity-30"
        aria-label="Aşağı"
      >
        ↓
      </button>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Inline JSON editor for the `props` bag. Parses on blur — keeps the raw text
 * so a half-typed key doesn't snap back. Invalid JSON shows an error badge but
 * doesn't lose the user's keystrokes.
 */
function PropsJsonEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [err, setErr] = useState<string | null>(null);

  // Sync when parent props change due to other edits (label/icon/color/type fields).
  // We diff on serialized form to avoid clobbering an in-progress edit.
  const serialized = useMemo(() => JSON.stringify(value, null, 2), [value]);
  useEffect(() => {
    // Defer the sync setText out of the effect body (react-hooks/set-state-in-effect).
    const id = setTimeout(() => {
      setText((cur) => {
        try {
          if (JSON.stringify(JSON.parse(cur)) === JSON.stringify(value)) return cur;
        } catch {
          return serialized;
        }
        return serialized;
      });
    }, 0);
    return () => clearTimeout(id);
  }, [serialized, value]);

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              setErr(null);
              onChange(parsed as Record<string, unknown>);
            } else {
              setErr("Object bekleniyor");
            }
          } catch (e) {
            setErr((e as Error).message);
          }
        }}
        rows={6}
        spellCheck={false}
        className={`w-full px-2.5 py-2 rounded-lg border text-xs font-mono outline-none focus:ring-2 focus:ring-orange-300 ${
          err ? "border-red-400 bg-red-50" : "border-slate-300 bg-slate-50"
        }`}
      />
      {err && <p className="mt-1 text-[11px] text-red-600">JSON hatası: {err}</p>}
    </div>
  );
}
