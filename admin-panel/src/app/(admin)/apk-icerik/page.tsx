"use client";

/**
 * /apk-icerik — App content control: settings, layouts, visibility rules, popups.
 * Settings: search + sort + pagination + CSV export.
 * Layout: 8 screen presets + structured props editor (type/icon/label/color).
 * Visibility: 4-col row layout with inline save.
 * Popups & Menus: dedicated screen=popup curator.
 */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  api,
  type AdminAppConfig,
  type AppConfigLayout,
  type AppConfigLayoutItem,
  type AppConfigSetting,
  type AppConfigVisibilityRule,
  type AppScreen,
} from "@/lib/api";
import { exportCsv } from "@/lib/export";

const ApkPreviewModal = dynamic(
  () =>
    import("@/components/apk-preview/ApkPreviewModal").then((m) => m.ApkPreviewModal),
  { ssr: false },
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

type SortableLayoutItem = AppConfigLayoutItem & { _dndId: string };

let _icerikDndCounter = 0;
function nextIcerikDndId(): string {
  _icerikDndCounter += 1;
  return `il-${_icerikDndCounter}-${Date.now().toString(36)}`;
}

type Tab = "settings" | "layout" | "visibility" | "popups" | "pages";
type SettingType = "string" | "number" | "boolean" | "json";

const SCREENS = [
  "main_shell",
  "profile_card",
  "job_detail",
  "bottom_nav",
  "service_request",
  "home_categories",
  "popup_titles",
  "menu_items",
] as const;

const COMPONENT_TYPES = ["button", "tab", "card", "label", "section", "menu", "popup", "table"];

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
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"key" | "updated">("key");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows;
    if (needle) {
      list = list.filter((s) =>
        s.key.toLowerCase().includes(needle) ||
        JSON.stringify(s.value ?? "").toLowerCase().includes(needle),
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "key") return a.key.localeCompare(b.key);
      return String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
    });
    return list;
  }, [rows, q, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    // reset page if filter shrinks list
    if (page > totalPages) {
      const id = setTimeout(() => setPage(1), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [page, totalPages]);

  const startEdit = (s: AppConfigSetting) =>
    setEditing((p) => ({ ...p, [s.key]: JSON.stringify(s.value ?? "") }));

  const saveEdit = async (s: AppConfigSetting) => {
    try {
      const parsed = parseByType(editing[s.key], s.type ?? "string");
      await api.patchSetting(s.key, parsed, { type: s.type ?? "string" });
      setEditing((p) => { const n = { ...p }; delete n[s.key]; return n; });
      await onChanged();
      flash("ok", `${s.key} güncellendi`);
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
  };

  const remove = async (key: string) => {
    if (!confirm(`'${key}' silinsin mi?`)) return;
    try {
      await api.deleteSetting(key);
      await onChanged();
      flash("ok", "Silindi");
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
  };

  const add = async () => {
    if (!newKey.trim()) return;
    try {
      const parsed = parseByType(newValue, newType);
      await api.patchSetting(newKey.trim(), parsed, { type: newType });
      setNewKey(""); setNewValue(""); setNewType("string"); setAdding(false);
      await onChanged();
      flash("ok", "Eklendi");
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
  };

  const doExport = () => {
    exportCsv(
      filtered.map((s) => ({ key: s.key, type: s.type ?? "string", value: JSON.stringify(s.value), updatedAt: s.updatedAt ?? "" })),
      "apk-settings.csv",
    );
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-white">Ayarlar ({filtered.length}{filtered.length !== rows.length ? `/${rows.length}` : ""})</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="🔍 ara…"
            className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-emerald-400/40 w-40"
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "key" | "updated")}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none">
            <option className="bg-slate-900" value="key">Key A→Z</option>
            <option className="bg-slate-900" value="updated">Son güncel</option>
          </select>
          <button onClick={doExport} className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 text-xs font-semibold">⇩ CSV</button>
          <button onClick={() => setAdding((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-semibold transition">
            {adding ? "✕ İptal" : "+ Ayar Ekle"}
          </button>
        </div>
      </div>

      {adding && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-400/20 grid grid-cols-12 gap-2">
          <input type="text" placeholder="key" value={newKey} onChange={(e) => setNewKey(e.target.value)}
            className="col-span-4 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40" />
          <select value={newType} onChange={(e) => setNewType(e.target.value as SettingType)}
            className="col-span-2 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none">
            <option className="bg-slate-900" value="string">string</option>
            <option className="bg-slate-900" value="number">number</option>
            <option className="bg-slate-900" value="boolean">boolean</option>
            <option className="bg-slate-900" value="json">json</option>
          </select>
          <input type="text" placeholder="value" value={newValue} onChange={(e) => setNewValue(e.target.value)}
            className="col-span-4 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40 font-mono" />
          <button onClick={add} className="col-span-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold">Kaydet</button>
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
            {pageRows.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-slate-500 text-xs">Sonuç yok</td></tr>
            )}
            {pageRows.map((s) => {
              const isEditing = editing[s.key] !== undefined;
              return (
                <tr key={s.key} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 px-2 font-mono text-xs text-emerald-200">{s.key}</td>
                  <td className="py-2 px-2 text-xs text-slate-400">{s.type ?? "string"}</td>
                  <td className="py-2 px-2 font-mono text-xs text-white">
                    {isEditing ? (
                      <input value={editing[s.key]} onChange={(e) => setEditing((p) => ({ ...p, [s.key]: e.target.value }))}
                        className="w-full bg-white/10 border border-emerald-400/30 rounded px-2 py-1 text-white outline-none" />
                    ) : (<span className="text-slate-300">{JSON.stringify(s.value)}</span>)}
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

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>Sayfa {page} / {totalPages}</span>
          <div className="flex gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30">‹</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30">›</button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function parseByType(raw: string, type: string): unknown {
  if (type === "number") return Number(raw);
  if (type === "boolean") return raw === "true" || raw === "1";
  if (type === "json") { try { return JSON.parse(raw); } catch { return raw; } }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : raw;
  } catch { return raw; }
}

// ─── Layout tab ────────────────────────────────────────────────────────────

const SortableLayoutRow = memo(function SortableLayoutRow({
  item, idx, total, onMoveUp, onMoveDown, onToggleVisible, onPatchProps, onRemove,
}: {
  item: SortableLayoutItem; idx: number; total: number;
  onMoveUp: () => void; onMoveDown: () => void;
  onToggleVisible: () => void;
  onPatchProps: (next: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._dndId });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const props = item.props ?? {};
  const setProp = (k: string, v: string) => onPatchProps({ ...props, [k]: v });

  return (
    <li ref={setNodeRef} style={style}
      className={`p-2.5 rounded-lg bg-white/5 border border-white/10 ${isDragging ? "shadow-lg shadow-emerald-500/20 bg-white/10" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <button {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-emerald-300 px-1 select-none"
          aria-label="Sürükle" title="Sürükleyerek sırala">⋮⋮</button>
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={idx === 0} className="w-6 h-5 rounded bg-white/5 hover:bg-white/15 text-slate-300 text-xs disabled:opacity-30">▲</button>
          <button onClick={onMoveDown} disabled={idx === total - 1} className="w-6 h-5 rounded bg-white/5 hover:bg-white/15 text-slate-300 text-xs disabled:opacity-30">▼</button>
        </div>
        <div className="font-mono text-sm text-emerald-200 flex-1 truncate">{item.key}</div>
        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" checked={item.visible} onChange={onToggleVisible} className="accent-emerald-400" /> görünür
        </label>
        <button onClick={onRemove} className="text-xs text-red-300 hover:text-red-100 px-2 py-1 rounded bg-red-500/10">sil</button>
      </div>
      {/* Structured props editor */}
      <div className="grid grid-cols-12 gap-2 pl-7">
        <select value={String(props.type ?? "")} onChange={(e) => setProp("type", e.target.value)}
          className="col-span-2 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white outline-none">
          <option value="" className="bg-slate-900">type…</option>
          {COMPONENT_TYPES.map((t) => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
        </select>
        <input value={String(props.icon ?? "")} onChange={(e) => setProp("icon", e.target.value)} placeholder="icon"
          className="col-span-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white outline-none" />
        <input value={String(props.label ?? "")} onChange={(e) => setProp("label", e.target.value)} placeholder="label"
          className="col-span-4 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white outline-none" />
        <input value={String(props.color ?? "")} onChange={(e) => setProp("color", e.target.value)} placeholder="#color"
          className="col-span-2 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white outline-none font-mono" />
        <input value={String(props.action ?? "")} onChange={(e) => setProp("action", e.target.value)} placeholder="action"
          className="col-span-3 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white outline-none" />
      </div>
    </li>
  );
});

function LayoutTab({
  layouts, onChanged, flash,
}: {
  layouts: AppConfigLayout[];
  onChanged: () => Promise<void>;
  flash: (k: "ok" | "err", t: string) => void;
}) {
  const [screen, setScreen] = useState<string>(SCREENS[0]);
  const [items, setItems] = useState<SortableLayoutItem[]>([]);

  useEffect(() => {
    const id = setTimeout(() => {
      const current = layouts.find((l) => l.screen === screen);
      setItems((current?.items ?? []).map<SortableLayoutItem>((it) => ({ ...it, _dndId: nextIcerikDndId() })));
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
  const patchProps = (idx: number, next: Record<string, unknown>) =>
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, props: next } : it)));
  const addItem = () => {
    const key = prompt("Yeni item key (örn: featured_jobs)");
    if (!key) return;
    setItems((p) => [...p, { key, visible: true, props: { type: "card" }, _dndId: nextIcerikDndId() }]);
  };
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const save = async () => {
    try {
      const payload: AppConfigLayoutItem[] = items.map(({ _dndId: _drop, ...rest }) => { void _drop; return rest; });
      await api.putLayout(screen, payload);
      await onChanged();
      flash("ok", `${screen} kaydedildi`);
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
  };

  const doExport = () => {
    exportCsv(items.map((it) => ({ key: it.key, visible: String(it.visible), type: String(it.props?.type ?? ""), label: String(it.props?.label ?? ""), icon: String(it.props?.icon ?? ""), color: String(it.props?.color ?? "") })), `apk-layout-${screen}.csv`);
  };

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

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase text-slate-400 font-semibold">Ekran:</span>
          <select value={screen} onChange={(e) => setScreen(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none">
            {SCREENS.map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={doExport} className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 text-xs font-semibold">⇩ CSV</button>
          <button onClick={addItem} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 text-xs font-semibold">+ Item Ekle</button>
          <button onClick={() => void save()} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold">💾 Layout Kaydet</button>
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
                <SortableLayoutRow key={it._dndId} item={it} idx={idx} total={items.length}
                  onMoveUp={() => move(idx, -1)} onMoveDown={() => move(idx, +1)}
                  onToggleVisible={() => toggleVisible(idx)}
                  onPatchProps={(np) => patchProps(idx, np)}
                  onRemove={() => removeItem(idx)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </GlassCard>
  );
}

// ─── Visibility tab ────────────────────────────────────────────────────────

function VisibilityRow({ rule, flash, onChanged }: {
  rule: AppConfigVisibilityRule;
  flash: (k: "ok" | "err", t: string) => void;
  onChanged: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState<boolean>(rule.enabled ?? true);
  const [roles, setRoles] = useState<string[]>(rule.roles ?? []);
  const [devices, setDevices] = useState<string[]>(rule.devices ?? []);
  const [startsAt, setStartsAt] = useState<string>(rule.startsAt ?? "");
  const [endsAt, setEndsAt] = useState<string>(rule.endsAt ?? "");
  const [busy, setBusy] = useState(false);

  const toggle = (list: string[], v: string) => list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const save = async () => {
    setBusy(true);
    try {
      await api.patchVisibility(rule.moduleKey, { roles, devices, enabled, startsAt: startsAt || null, endsAt: endsAt || null });
      await onChanged();
      flash("ok", `${rule.moduleKey} güncellendi`);
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setBusy(false); }
  };

  return (
    <tr className="border-b border-white/5">
      <td className="py-2.5 px-2 font-mono text-xs text-emerald-200">{rule.moduleKey}</td>
      <td className="py-2.5 px-2">
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-emerald-400" />
          {enabled ? "aktif" : "pasif"}
        </label>
      </td>
      <td className="py-2.5 px-2">
        <div className="flex flex-wrap gap-1">
          {["customer", "worker", "admin"].map((r) => (
            <button key={r} onClick={() => setRoles((p) => toggle(p, r))}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${roles.includes(r) ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-100" : "bg-white/5 border-white/10 text-slate-400"}`}>{r}</button>
          ))}
        </div>
      </td>
      <td className="py-2.5 px-2">
        <div className="flex flex-wrap gap-1">
          {["ios", "android", "web"].map((d) => (
            <button key={d} onClick={() => setDevices((p) => toggle(p, d))}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${devices.includes(d) ? "bg-sky-500/30 border-sky-400/50 text-sky-100" : "bg-white/5 border-white/10 text-slate-400"}`}>{d}</button>
          ))}
        </div>
      </td>
      <td className="py-2.5 px-2">
        <div className="flex gap-1">
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white outline-none w-36" />
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white outline-none w-36" />
        </div>
      </td>
      <td className="py-2.5 px-2 text-right">
        <button onClick={() => void save()} disabled={busy}
          className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">
          {busy ? "…" : "Kaydet"}
        </button>
      </td>
    </tr>
  );
}

function VisibilityTab({
  rules, onChanged, flash,
}: {
  rules: AppConfigVisibilityRule[];
  onChanged: () => Promise<void>;
  flash: (k: "ok" | "err", t: string) => void;
}) {
  const [newKey, setNewKey] = useState("");

  const add = async () => {
    if (!newKey.trim()) return;
    try {
      await api.patchVisibility(newKey.trim(), { roles: [], devices: [], enabled: true });
      setNewKey("");
      await onChanged();
      flash("ok", "Eklendi");
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-white">Görünürlük Kuralları ({rules.length})</h3>
        <div className="flex items-center gap-2">
          <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)}
            placeholder="yeni moduleKey…"
            className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-emerald-400/40 font-mono" />
          <button onClick={() => void add()} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">+ Ekle</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase text-slate-400 border-b border-white/10">
            <tr>
              <th className="text-left py-2 px-2">Module</th>
              <th className="text-left py-2 px-2 w-24">Active</th>
              <th className="text-left py-2 px-2 w-48">Roles</th>
              <th className="text-left py-2 px-2 w-44">Devices</th>
              <th className="text-left py-2 px-2">Schedule</th>
              <th className="text-right py-2 px-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-500 text-xs">Kural yok</td></tr>
            )}
            {rules.map((r) => <VisibilityRow key={r.moduleKey} rule={r} flash={flash} onChanged={onChanged} />)}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// ─── Popups & Menus tab ────────────────────────────────────────────────────

function PopupsTab({
  layouts, onChanged, flash,
}: {
  layouts: AppConfigLayout[];
  onChanged: () => Promise<void>;
  flash: (k: "ok" | "err", t: string) => void;
}) {
  // Reuse "popup" + "menu_items" + "popup_titles" screens. Show two stacked editors.
  const popupItems = (layouts.find((l) => l.screen === "popup_titles")?.items ?? []);
  const menuItems = (layouts.find((l) => l.screen === "menu_items")?.items ?? []);
  const [popups, setPopups] = useState<AppConfigLayoutItem[]>(popupItems);
  const [menus, setMenus] = useState<AppConfigLayoutItem[]>(menuItems);

  useEffect(() => {
    const id = setTimeout(() => {
      setPopups(layouts.find((l) => l.screen === "popup_titles")?.items ?? []);
      setMenus(layouts.find((l) => l.screen === "menu_items")?.items ?? []);
    }, 0);
    return () => clearTimeout(id);
  }, [layouts]);

  const editList = (
    list: AppConfigLayoutItem[],
    setList: (next: AppConfigLayoutItem[]) => void,
    screen: string,
    title: string,
    addLabel: string,
    fields: { key: string; placeholder: string }[],
  ) => (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">{title} ({list.length})</h3>
        <div className="flex gap-2">
          <button onClick={() => {
            const key = prompt(addLabel);
            if (!key) return;
            setList([...list, { key, visible: true, props: {} }]);
          }} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 text-xs font-semibold">+ Ekle</button>
          <button onClick={async () => {
            try {
              await api.putLayout(screen, list);
              await onChanged();
              flash("ok", `${screen} kaydedildi`);
            } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
          }} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold">💾 Kaydet</button>
        </div>
      </div>
      <ul className="space-y-2">
        {list.length === 0 && <li className="py-6 text-center text-slate-500 text-xs">Boş</li>}
        {list.map((it, idx) => (
          <li key={`${it.key}-${idx}`} className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs text-emerald-200 flex-1 truncate">{it.key}</span>
              <label className="flex items-center gap-1 text-xs text-slate-300">
                <input type="checkbox" checked={it.visible} onChange={() => setList(list.map((x, i) => i === idx ? { ...x, visible: !x.visible } : x))} className="accent-emerald-400" /> görünür
              </label>
              <button onClick={() => setList(list.filter((_, i) => i !== idx))} className="text-xs text-red-300 hover:text-red-100 px-2 py-0.5 rounded bg-red-500/10">sil</button>
            </div>
            <div className="grid grid-cols-12 gap-2">
              {fields.map((f) => (
                <input key={f.key} value={String(it.props?.[f.key] ?? "")} placeholder={f.placeholder}
                  onChange={(e) => setList(list.map((x, i) => i === idx ? { ...x, props: { ...(x.props ?? {}), [f.key]: e.target.value } } : x))}
                  className="col-span-4 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-emerald-400/40" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {editList(popups, setPopups, "popup_titles", "💬 Popup Başlıkları", "Popup key (örn: welcome_popup)", [
        { key: "title", placeholder: "Başlık" },
        { key: "content", placeholder: "İçerik" },
        { key: "buttonLabel", placeholder: "Buton" },
      ])}
      {editList(menus, setMenus, "menu_items", "📋 Menü Öğeleri", "Menu key (örn: settings_menu)", [
        { key: "label", placeholder: "Etiket" },
        { key: "icon", placeholder: "İkon" },
        { key: "action", placeholder: "Aksiyon" },
      ])}
    </div>
  );
}

// ─── Pages registry tab (Phase 276) ───────────────────────────────────────

const POPULAR_ICONS = [
  "home", "search", "map", "work", "person", "login", "person_add",
  "security", "lock_reset", "add_circle", "description", "support_agent",
  "fact_check", "badge", "edit", "photo_library", "chat", "notifications",
  "tune", "monetization_on", "account_balance", "payments", "currency_bitcoin",
  "event", "event_available", "calendar_month", "verified_user", "task_alt",
  "rate_review", "favorite", "bookmark", "block", "inventory", "mail_outline",
  "school", "report", "settings", "help_outline", "info",
];

const SCREEN_CATEGORIES = [
  "main_nav", "auth", "job", "profile", "communication", "settings",
  "wallet", "booking", "escrow", "community", "tools", "admin_only", "other",
];

function ScreenEditModal({
  initial, isNew, onClose, onSave,
}: {
  initial: AppScreen | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (data: AppScreen) => Promise<void>;
}) {
  const [form, setForm] = useState<AppScreen>(
    initial ?? {
      key: "", name: "", description: "", iconName: "",
      category: "other", visible: true, sortOrder: 0, previewImageUrl: "",
    },
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.key.trim() || !form.name.trim()) return;
    setBusy(true);
    try { await onSave(form); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">
          {isNew ? "➕ Yeni Sayfa Ekle" : `✏️ ${form.key}`}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-1">
            <label className="block text-xs text-slate-400 mb-1">Key (kod)</label>
            <input value={form.key} disabled={!isNew}
              onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
              placeholder="ornek_anahtar"
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40 font-mono disabled:opacity-50" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-slate-400 mb-1">Sıra (sortOrder)</label>
            <input type="number" value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Ad</label>
            <input value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sayfa adı"
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Açıklama</label>
            <textarea value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-slate-400 mb-1">İkon</label>
            <select value={form.iconName ?? ""}
              onChange={(e) => setForm({ ...form, iconName: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none">
              <option value="" className="bg-slate-900">— seç —</option>
              {POPULAR_ICONS.map((i) => <option key={i} value={i} className="bg-slate-900">{i}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs text-slate-400 mb-1">Kategori</label>
            <select value={form.category ?? "other"}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none">
              {SCREEN_CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Önizleme görseli (URL)</label>
            <input value={form.previewImageUrl ?? ""}
              onChange={(e) => setForm({ ...form, previewImageUrl: e.target.value })}
              placeholder="https://…"
              className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-400/40 font-mono text-xs" />
          </div>
          <div className="col-span-2 flex items-center gap-2 mt-1">
            <label className="inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
              <input type="checkbox" checked={form.visible}
                onChange={(e) => setForm({ ...form, visible: e.target.checked })}
                className="accent-emerald-400 w-4 h-4" />
              {form.visible ? "Aktif (görünür)" : "Pasif (gizli)"}
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 text-sm">
            İptal
          </button>
          <button onClick={() => void save()} disabled={busy || !form.key.trim() || !form.name.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
            {busy ? "…" : "💾 Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScreenCard({
  screen, onToggle, onEdit, onDelete,
}: {
  screen: AppScreen;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`relative p-4 rounded-xl border transition ${
      screen.visible
        ? "bg-white/5 border-white/10 hover:border-emerald-400/40"
        : "bg-red-500/5 border-red-400/20 opacity-70"
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-3xl select-none">
          <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
            {screen.iconName || "widgets"}
          </span>
        </div>
        <button onClick={onToggle}
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
            screen.visible
              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
              : "bg-red-500/20 border-red-400/40 text-red-200"
          }`}>
          {screen.visible ? "AKTİF" : "PASİF"}
        </button>
      </div>
      <div className="text-sm font-semibold text-white mb-1 truncate" title={screen.name}>
        {screen.name}
      </div>
      <div className="font-mono text-[10px] text-slate-500 mb-2 truncate">{screen.key}</div>
      {screen.category && (
        <div className="inline-block px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] uppercase text-slate-400 mb-2">
          {screen.category}
        </div>
      )}
      <div className="flex items-center gap-1 mt-2">
        <button onClick={onEdit}
          className="flex-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-semibold">
          ✏️ Düzenle
        </button>
        <button onClick={onDelete}
          className="px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 text-red-200 text-xs">
          🗑️
        </button>
      </div>
    </div>
  );
}

function PagesTab({ flash }: { flash: (k: "ok" | "err", t: string) => void }) {
  const [screens, setScreens] = useState<AppScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [editing, setEditing] = useState<AppScreen | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listScreens();
      setScreens(list);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    const id = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return screens.filter((s) => {
      if (cat && s.category !== cat) return false;
      if (needle) {
        const hay = `${s.key} ${s.name} ${s.description ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [screens, q, cat]);

  const toggleVisible = async (s: AppScreen) => {
    try {
      const updated = await api.updateScreen(s.key, { visible: !s.visible });
      setScreens((prev) => prev.map((x) => (x.key === s.key ? updated : x)));
      flash("ok", `${s.name}: ${updated.visible ? "aktif" : "pasif"}`);
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
  };

  const onSave = async (data: AppScreen) => {
    try {
      if (adding) {
        const created = await api.createScreen({
          key: data.key, name: data.name,
          description: data.description ?? null,
          iconName: data.iconName ?? null,
          category: data.category ?? null,
          visible: data.visible, sortOrder: data.sortOrder,
          previewImageUrl: data.previewImageUrl ?? null,
        });
        setScreens((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
        flash("ok", "Eklendi");
      } else {
        const { key, createdAt: _c, updatedAt: _u, ...rest } = data;
        void _c; void _u;
        const updated = await api.updateScreen(key, rest);
        setScreens((prev) => prev.map((x) => (x.key === key ? updated : x)));
        flash("ok", "Güncellendi");
      }
      setEditing(null);
      setAdding(false);
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
  };

  const onDelete = async (s: AppScreen) => {
    if (!confirm(`"${s.name}" sayfasını sil? (${s.key})`)) return;
    try {
      await api.deleteScreen(s.key);
      setScreens((prev) => prev.filter((x) => x.key !== s.key));
      flash("ok", "Silindi");
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
  };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-white">
          Tüm Sayfalar ({filtered.length}{filtered.length !== screens.length ? `/${screens.length}` : ""})
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 ara…"
            className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-emerald-400/40 w-40" />
          <select value={cat} onChange={(e) => setCat(e.target.value)}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none">
            <option value="" className="bg-slate-900">tümü</option>
            {SCREEN_CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>
          <button onClick={() => { setAdding(true); setEditing(null); }}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
            ➕ Yeni Sayfa
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs">Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs">Sayfa bulunamadı</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((s) => (
            <ScreenCard key={s.key} screen={s}
              onToggle={() => void toggleVisible(s)}
              onEdit={() => { setEditing(s); setAdding(false); }}
              onDelete={() => void onDelete(s)} />
          ))}
        </div>
      )}

      {(editing || adding) && (
        <ScreenEditModal initial={adding ? null : editing}
          isNew={adding}
          onClose={() => { setEditing(null); setAdding(false); }}
          onSave={onSave} />
      )}
    </GlassCard>
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
          <p className="text-sm text-slate-400 mt-1">Ayarlar, ekran düzeni, görünürlük, popup ve menü kontrolü</p>
        </div>
        <button onClick={() => setPreviewOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition">
          📱 APK Önizleme
        </button>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium border ${toast.kind === "ok" ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200" : "bg-red-500/10 border-red-400/30 text-red-200"}`}>
          {toast.text}
        </div>
      )}

      <div className="flex gap-1 mb-5 p-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xl w-fit">
        {([
          { k: "settings",   l: "⚙️ Ayarlar" },
          { k: "layout",     l: "🧩 Layout" },
          { k: "visibility", l: "👁️ Görünürlük" },
          { k: "popups",     l: "💬 Popups & Menus" },
          { k: "pages",      l: "📄 Sayfalar" },
        ] as { k: Tab; l: string }[]).map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === k ? "bg-emerald-500 text-white shadow-md" : "text-slate-300 hover:text-white hover:bg-white/5"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "settings"   && <SettingsTab   rows={settings} onChanged={load} flash={flash} />}
      {tab === "layout"     && <LayoutTab     layouts={layouts} onChanged={load} flash={flash} />}
      {tab === "visibility" && <VisibilityTab rules={rules} onChanged={load} flash={flash} />}
      {tab === "popups"     && <PopupsTab     layouts={layouts} onChanged={load} flash={flash} />}
      {tab === "pages"      && <PagesTab      flash={flash} />}

      {previewOpen && <ApkPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
