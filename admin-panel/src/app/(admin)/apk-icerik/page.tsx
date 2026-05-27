"use client";

/**
 * /apk-icerik — App content control: settings, layouts, visibility rules.
 * Three tabs, all glass cards on animated gradient bg, with shared preview modal.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type AdminAppConfig,
  type AppConfigLayout,
  type AppConfigLayoutItem,
  type AppConfigSetting,
  type AppConfigVisibilityRule,
} from "@/lib/api";
import { ApkPreviewModal } from "@/components/apk-preview/ApkPreviewModal";
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

/** Layout item augmented with a stable id for dnd-kit. Server payload does not
 * carry an id, and `key` may repeat, so we generate one on load and strip it
 * before PUT. */
type SortableLayoutItem = AppConfigLayoutItem & { _dndId: string };

let _icerikDndCounter = 0;
function nextIcerikDndId(): string {
  _icerikDndCounter += 1;
  return `il-${_icerikDndCounter}-${Date.now().toString(36)}`;
}

type Tab = "settings" | "layout" | "visibility";
type SettingType = "string" | "number" | "boolean" | "json";

const SCREENS = ["main_shell", "profile", "job_detail"] as const;

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── Settings tab ──────────────────────────────────────────────────────────

function SettingsTab({
  rows,
  onChanged,
  flash,
}: {
  rows: AppConfigSetting[];
  onChanged: () => Promise<void>;
  flash: (k: "ok" | "err", t: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newType, setNewType] = useState<SettingType>("string");
  const [newValue, setNewValue] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});

  const startEdit = (s: AppConfigSetting) =>
    setEditing((p) => ({ ...p, [s.key]: JSON.stringify(s.value ?? "") }));

  const saveEdit = async (s: AppConfigSetting) => {
    try {
      const raw = editing[s.key];
      const parsed = parseByType(raw, s.type ?? "string");
      await api.patchSetting(s.key, parsed, { type: s.type ?? "string" });
      setEditing((p) => { const n = { ...p }; delete n[s.key]; return n; });
      await onChanged();
      flash("ok", `${s.key} güncellendi`);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    }
  };

  const remove = async (key: string) => {
    if (!confirm(`'${key}' silinsin mi?`)) return;
    try {
      await api.deleteSetting(key);
      await onChanged();
      flash("ok", "Silindi");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    }
  };

  const add = async () => {
    if (!newKey.trim()) return;
    try {
      const parsed = parseByType(newValue, newType);
      await api.patchSetting(newKey.trim(), parsed, { type: newType });
      setNewKey(""); setNewValue(""); setNewType("string"); setAdding(false);
      await onChanged();
      flash("ok", "Eklendi");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    }
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Ayarlar ({rows.length})</h3>
        <button
          onClick={() => setAdding((v) => !v)}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-semibold transition"
        >
          {adding ? "✕ İptal" : "+ Ayar Ekle"}
        </button>
      </div>

      {adding && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-400/20 grid grid-cols-12 gap-2">
          <input
            type="text"
            placeholder="key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="col-span-4 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as SettingType)}
            className="col-span-2 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none"
          >
            <option className="bg-slate-900" value="string">string</option>
            <option className="bg-slate-900" value="number">number</option>
            <option className="bg-slate-900" value="boolean">boolean</option>
            <option className="bg-slate-900" value="json">json</option>
          </select>
          <input
            type="text"
            placeholder="value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="col-span-4 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40 font-mono"
          />
          <button onClick={add} className="col-span-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold">
            Kaydet
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase text-slate-400 border-b border-white/10">
            <tr>
              <th className="text-left py-2 px-2">Key</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-left py-2 px-2">Value</th>
              <th className="text-right py-2 px-2 w-32">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-slate-500 text-xs">Henüz ayar yok</td></tr>
            )}
            {rows.map((s) => {
              const isEditing = editing[s.key] !== undefined;
              return (
                <tr key={s.key} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 px-2 font-mono text-xs text-emerald-200">{s.key}</td>
                  <td className="py-2 px-2 text-xs text-slate-400">{s.type ?? "string"}</td>
                  <td className="py-2 px-2 font-mono text-xs text-white">
                    {isEditing ? (
                      <input
                        value={editing[s.key]}
                        onChange={(e) => setEditing((p) => ({ ...p, [s.key]: e.target.value }))}
                        className="w-full bg-white/10 border border-emerald-400/30 rounded px-2 py-1 text-white outline-none"
                      />
                    ) : (
                      <span className="text-slate-300">{JSON.stringify(s.value)}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {isEditing ? (
                      <button onClick={() => void saveEdit(s)} className="text-emerald-300 hover:text-emerald-100 text-xs font-semibold mr-2">Kaydet</button>
                    ) : (
                      <button onClick={() => startEdit(s)} className="text-slate-300 hover:text-white text-xs mr-2">Düzenle</button>
                    )}
                    <button onClick={() => void remove(s.key)} className="text-red-300 hover:text-red-100 text-xs">Sil</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function parseByType(raw: string, type: string): unknown {
  if (type === "number") return Number(raw);
  if (type === "boolean") return raw === "true" || raw === "1";
  if (type === "json") { try { return JSON.parse(raw); } catch { return raw; } }
  // Tolerate "quoted" strings as well as bare ones.
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch {
    return raw;
  }
}

// ─── Layout tab ────────────────────────────────────────────────────────────

/**
 * One draggable row in the layout list. Drag handle = leading ⋮⋮ glyph.
 * Up/down arrows stay for keyboard a11y; the rest of the buttons keep
 * their click handlers and stop propagation so a click inside doesn't
 * also fire a drag-end.
 */
function SortableLayoutRow({
  item,
  idx,
  total,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onOpenProps,
  onRemove,
}: {
  item: SortableLayoutItem;
  idx: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisible: () => void;
  onOpenProps: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._dndId });

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
      className={`flex items-center gap-2 p-2.5 rounded-lg bg-white/5 border border-white/10 ${
        isDragging ? "shadow-lg shadow-emerald-500/20 bg-white/10" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-emerald-300 px-1 select-none"
        aria-label="Sürükle"
        title="Sürükleyerek sırala"
      >
        ⋮⋮
      </button>
      <div className="flex flex-col gap-0.5">
        <button onClick={onMoveUp} disabled={idx === 0} className="w-6 h-5 rounded bg-white/5 hover:bg-white/15 text-slate-300 text-xs disabled:opacity-30">▲</button>
        <button onClick={onMoveDown} disabled={idx === total - 1} className="w-6 h-5 rounded bg-white/5 hover:bg-white/15 text-slate-300 text-xs disabled:opacity-30">▼</button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm text-emerald-200 truncate">{item.key}</div>
        <div className="text-[10px] text-slate-500 font-mono truncate">{JSON.stringify(item.props ?? {})}</div>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
        <input type="checkbox" checked={item.visible} onChange={onToggleVisible} className="accent-emerald-400" />
        görünür
      </label>
      <button onClick={onOpenProps} className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-white/5">props</button>
      <button onClick={onRemove} className="text-xs text-red-300 hover:text-red-100 px-2 py-1 rounded bg-red-500/10">sil</button>
    </li>
  );
}

function LayoutTab({
  layouts,
  onChanged,
  flash,
}: {
  layouts: AppConfigLayout[];
  onChanged: () => Promise<void>;
  flash: (k: "ok" | "err", t: string) => void;
}) {
  const [screen, setScreen] = useState<string>(SCREENS[0]);
  const [items, setItems] = useState<SortableLayoutItem[]>([]);
  const [propsEditFor, setPropsEditFor] = useState<string | null>(null);
  const [propsRaw, setPropsRaw] = useState("");

  useEffect(() => {
    // Defer the screen→items sync past the effect body for the
    // react-hooks/set-state-in-effect lint rule.
    const id = setTimeout(() => {
      const current = layouts.find((l) => l.screen === screen);
      setItems(
        (current?.items ?? []).map<SortableLayoutItem>((it) => ({
          ...it,
          _dndId: nextIcerikDndId(),
        })),
      );
    }, 0);
    return () => clearTimeout(id);
  }, [screen, layouts]);

  const move = (idx: number, dir: -1 | 1) => {
    setItems((p) => {
      const next = [...p];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const toggleVisible = (idx: number) =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, visible: !it.visible } : it)));

  const addItem = () => {
    const key = prompt("Yeni item key (örn: featured_jobs)");
    if (!key) return;
    setItems((p) => [...p, { key, visible: true, props: {}, _dndId: nextIcerikDndId() }]);
  };

  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const openPropsEditor = (it: SortableLayoutItem) => {
    setPropsEditFor(it._dndId);
    setPropsRaw(JSON.stringify(it.props ?? {}, null, 2));
  };

  const savePropsEditor = () => {
    if (!propsEditFor) return;
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(propsRaw); } catch { flash("err", "Geçersiz JSON"); return; }
    setItems((p) => p.map((it) => (it._dndId === propsEditFor ? { ...it, props: parsed } : it)));
    setPropsEditFor(null);
  };

  const save = async () => {
    try {
      // Strip internal `_dndId` before sending to backend.
      const payload: AppConfigLayoutItem[] = items.map(({ _dndId: _drop, ...rest }) => {
        void _drop;
        return rest;
      });
      await api.putLayout(screen, payload);
      await onChanged();
      flash("ok", `${screen} kaydedildi`);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    }
  };

  // dnd-kit sensors & handler
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const from = prev.findIndex((it) => it._dndId === active.id);
      const to = prev.findIndex((it) => it._dndId === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  };

  // Find currently edited item by _dndId for the modal header label.
  const editingItem = propsEditFor ? items.find((it) => it._dndId === propsEditFor) : null;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase text-slate-400 font-semibold">Ekran:</span>
          <select
            value={screen}
            onChange={(e) => setScreen(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none"
          >
            {SCREENS.map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addItem} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 text-xs font-semibold">
            + Item Ekle
          </button>
          <button onClick={() => void save()} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold">
            💾 Layout Kaydet
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <ul className="space-y-2">
          <li className="py-8 text-center text-slate-500 text-xs">Bu ekranda item yok</li>
        </ul>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((it) => it._dndId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((it, idx) => (
                <SortableLayoutRow
                  key={it._dndId}
                  item={it}
                  idx={idx}
                  total={items.length}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, +1)}
                  onToggleVisible={() => toggleVisible(idx)}
                  onOpenProps={() => openPropsEditor(it)}
                  onRemove={() => removeItem(idx)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* Props editor */}
      {propsEditFor && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setPropsEditFor(null)}>
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-bold text-white mb-3">Props — <span className="font-mono text-emerald-300">{editingItem?.key ?? propsEditFor}</span></h4>
            <textarea
              value={propsRaw}
              onChange={(e) => setPropsRaw(e.target.value)}
              className="w-full h-56 bg-slate-950 border border-white/10 rounded-lg p-3 text-xs font-mono text-emerald-100 outline-none focus:border-emerald-400/40"
              spellCheck={false}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setPropsEditFor(null)} className="px-3 py-1.5 text-xs text-slate-300 hover:text-white">İptal</button>
              <button onClick={savePropsEditor} className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold">Uygula</button>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Visibility tab ────────────────────────────────────────────────────────

function VisibilityTab({
  rules,
  onChanged,
  flash,
}: {
  rules: AppConfigVisibilityRule[];
  onChanged: () => Promise<void>;
  flash: (k: "ok" | "err", t: string) => void;
}) {
  const [moduleKey, setModuleKey] = useState("");
  const [draft, setDraft] = useState<Required<Pick<AppConfigVisibilityRule, "roles" | "devices" | "enabled">> & { startsAt: string; endsAt: string }>({
    roles: [],
    devices: [],
    enabled: true,
    startsAt: "",
    endsAt: "",
  });

  const loadInto = (r: AppConfigVisibilityRule) => {
    setModuleKey(r.moduleKey);
    setDraft({
      roles: r.roles ?? [],
      devices: r.devices ?? [],
      enabled: r.enabled ?? true,
      startsAt: r.startsAt ?? "",
      endsAt: r.endsAt ?? "",
    });
  };

  const toggle = (kind: "roles" | "devices", v: string) =>
    setDraft((p) => ({
      ...p,
      [kind]: p[kind].includes(v) ? p[kind].filter((x) => x !== v) : [...p[kind], v],
    }));

  const save = async () => {
    if (!moduleKey.trim()) { flash("err", "moduleKey gerekli"); return; }
    try {
      await api.patchVisibility(moduleKey.trim(), {
        roles: draft.roles,
        devices: draft.devices,
        enabled: draft.enabled,
        startsAt: draft.startsAt || null,
        endsAt: draft.endsAt || null,
      });
      await onChanged();
      flash("ok", "Kaydedildi");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Hata");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Editor */}
      <GlassCard>
        <h3 className="text-sm font-bold text-white mb-4">Kural Düzenle</h3>
        <div className="space-y-3">
          <label className="block">
            <span className="block text-[11px] uppercase text-slate-400 font-semibold mb-1.5">Module Key</span>
            <input
              type="text"
              value={moduleKey}
              onChange={(e) => setModuleKey(e.target.value)}
              placeholder="örn: featured_jobs"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40 font-mono"
            />
          </label>
          <div>
            <span className="block text-[11px] uppercase text-slate-400 font-semibold mb-1.5">Roller</span>
            <div className="flex gap-2 flex-wrap">
              {["customer", "worker", "admin"].map((r) => (
                <label key={r} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={draft.roles.includes(r)} onChange={() => toggle("roles", r)} className="accent-emerald-400" />
                  {r}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-[11px] uppercase text-slate-400 font-semibold mb-1.5">Cihazlar</span>
            <div className="flex gap-2 flex-wrap">
              {["ios", "android", "web"].map((d) => (
                <label key={d} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={draft.devices.includes(d)} onChange={() => toggle("devices", d)} className="accent-emerald-400" />
                  {d}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[11px] uppercase text-slate-400 font-semibold mb-1.5">Başlangıç</span>
              <input type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft((p) => ({ ...p, startsAt: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none" />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase text-slate-400 font-semibold mb-1.5">Bitiş</span>
              <input type="datetime-local" value={draft.endsAt} onChange={(e) => setDraft((p) => ({ ...p, endsAt: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft((p) => ({ ...p, enabled: e.target.checked }))} className="accent-emerald-400" />
            Aktif
          </label>
          <button onClick={() => void save()} className="w-full mt-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold">
            💾 Kuralı Kaydet
          </button>
        </div>
      </GlassCard>

      {/* List */}
      <GlassCard>
        <h3 className="text-sm font-bold text-white mb-4">Mevcut Kurallar ({rules.length})</h3>
        <ul className="space-y-2">
          {rules.length === 0 && <li className="py-6 text-center text-slate-500 text-xs">Kural yok</li>}
          {rules.map((r) => (
            <li key={r.moduleKey} className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition" onClick={() => loadInto(r)}>
              <div className="flex items-start justify-between">
                <div className="font-mono text-sm text-emerald-200">{r.moduleKey}</div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>
                  {r.enabled ? "aktif" : "pasif"}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                roles: {(r.roles ?? []).join(", ") || "—"} · devices: {(r.devices ?? []).join(", ") || "—"}
              </div>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────

export default function ApkIcerikPage() {
  const [tab, setTab] = useState<Tab>("settings");
  const [data, setData] = useState<AdminAppConfig | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const flash = useCallback((kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api.getAdminAppConfig();
      setData(d);
    } catch {
      // Backend not deployed yet — show empty shells so the UI is still usable.
      setData({ branding: {}, themes: [], settings: [], layouts: [], visibility: [] });
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const settings = useMemo(() => data?.settings ?? [], [data]);
  const layouts  = useMemo(() => data?.layouts  ?? [], [data]);
  const rules    = useMemo(() => data?.visibility ?? [], [data]);

  return (
    <div className="min-h-full -m-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📦 APK İçerik Kontrol</h1>
          <p className="text-sm text-slate-400 mt-1">Ayarlar, ekran düzeni ve görünürlük kuralları</p>
        </div>
        <button
          onClick={() => setPreviewOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition"
        >
          📱 APK Önizleme
        </button>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium border ${toast.kind === "ok" ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200" : "bg-red-500/10 border-red-400/30 text-red-200"}`}>
          {toast.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xl w-fit">
        {([
          { k: "settings",   l: "⚙️ Ayarlar" },
          { k: "layout",     l: "🧩 Layout" },
          { k: "visibility", l: "👁️ Görünürlük" },
        ] as { k: Tab; l: string }[]).map(({ k, l }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === k ? "bg-emerald-500 text-white shadow-md" : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "settings"   && <SettingsTab   rows={settings} onChanged={load} flash={flash} />}
      {tab === "layout"     && <LayoutTab     layouts={layouts} onChanged={load} flash={flash} />}
      {tab === "visibility" && <VisibilityTab rules={rules} onChanged={load} flash={flash} />}

      <ApkPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
