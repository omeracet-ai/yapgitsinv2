"use client";

/**
 * /apk-icerik — APK Yönetim Merkezi (Phase 277 consolidation).
 *
 * Single hub with 9 tabs (URL ?tab=xxx persisted):
 *   pages · settings · layout · visibility · popups · theme · branding · profile-card · backup
 *
 * All new tabs follow the profile-card pattern: 2-col grid (left list w/ toggle+edit,
 * right live preview). Theme & Branding were lifted from /apk-tasarim (Phase 275),
 * Profile-Card from /profile-card (Phase 272), Backup from /backup (Phase 272).
 * Old routes /apk-tasarim, /profile-card, /backup redirect here.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  api,
  type AdminAppConfig,
  type AppConfigBranding,
  type AppConfigLayout,
  type AppConfigLayoutItem,
  type AppConfigSetting,
  type AppConfigThemeTokens,
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

type Tab =
  | "pages"
  | "settings"
  | "layout"
  | "visibility"
  | "popups"
  | "theme"
  | "branding"
  | "profile-card"
  | "backup";

const VALID_TABS: Tab[] = [
  "pages",
  "settings",
  "layout",
  "visibility",
  "popups",
  "theme",
  "branding",
  "profile-card",
  "backup",
];

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map((s) => (
              <div key={s.key}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 hover:bg-white/10 transition">
                <label className="inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={s.visible}
                    onChange={() => void toggleVisible(s)} />
                  <div className="w-9 h-5 bg-slate-700 peer-checked:bg-emerald-500 rounded-full relative transition-colors">
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${s.visible ? "translate-x-4" : ""}`} />
                  </div>
                </label>

                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-300 text-lg" aria-hidden>
                    {s.iconName ?? "widgets"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{s.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    {s.key}{s.category ? ` · ${s.category}` : ""}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono w-8 text-right">#{s.sortOrder}</div>

                <button onClick={() => { setEditing(s); setAdding(false); }}
                  className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300"
                  title="Düzenle">
                  ✏️
                </button>
                <a
                  href={`#flutter-route-${s.key}`}
                  onClick={(e) => { e.preventDefault(); flash("ok", `→ Flutter rotası: /${s.key}`); }}
                  className="text-xs px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-200"
                  title="Flutter ekran rotasını aç (deep-link mock)">
                  →
                </a>
                <button onClick={() => void onDelete(s)}
                  className="text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300"
                  title="Sil">
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-2">
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-4">
                <div className="text-[11px] text-slate-400 mb-2">📱 Aktif Sayfalar Önizleme</div>
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl border border-white/5 p-3 space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {filtered.filter((s) => s.visible).length === 0 ? (
                    <div className="py-6 text-center text-slate-600 text-[11px]">
                      Hiç aktif sayfa yok
                    </div>
                  ) : (
                    filtered.filter((s) => s.visible).sort((a, b) => a.sortOrder - b.sortOrder).map((s) => (
                      <div key={s.key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="material-symbols-outlined text-emerald-300 text-base">
                          {s.iconName ?? "widgets"}
                        </span>
                        <span className="text-[12px] text-slate-200 truncate">{s.name}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-2 text-center">
                  {filtered.filter((s) => s.visible).length} aktif / {filtered.length} toplam
                </div>
              </div>
            </div>
          </div>
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

// ═══════════════════════════════════════════════════════════════════════════
// Phase 277 — Consolidated tabs: Theme / Branding / Profile-Card / Backup
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_THEME_TOKENS: AppConfigThemeTokens = {
  primary: "#FF5A1F",
  surface: "#FFFFFF",
  text: "#1F2937",
  textMuted: "#64748B",
  radius: 16,
  font: "Inter",
  fontWeights: "400,500,600,700" as unknown as string,
  fontSizeXs: 12,
  fontSizeSm: 14,
  fontSizeMd: 16,
  fontSizeLg: 20,
  fontSizeXl: 24,
  fontSize2xl: 32,
  letterSpacing: 0,
  gradientPrimaryStart: "#FF5A1F",
  gradientPrimaryEnd: "#FFB400",
  gradientHeroStart: "#2D3E50",
  gradientHeroEnd: "#FF5A1F",
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 20,
  radiusXl: 28,
  spacingSm: 8,
  spacingMd: 12,
  spacingLg: 20,
  motionFast: 150,
  motionNormal: 250,
  motionSlow: 400,
  motionCurve: "easeOut" as unknown as string,
  mode: "light" as unknown as string,
  darkPrimary: "#FF7A3F",
  darkSurface: "#0F172A",
  darkText: "#F1F5F9",
  darkTextMuted: "#94A3B8",
};

const DEFAULT_BRANDING: AppConfigBranding = {
  appTitle: "Yapgitsin",
  logoUrl: "",
  iconUrl: "",
  splashUrl: "",
};

// ─── Theme tab — profile-card pattern (row-list + live preview) ──────────

type ThemeRow =
  | { kind: "color"; key: keyof AppConfigThemeTokens; label: string; section: string }
  | { kind: "num"; key: keyof AppConfigThemeTokens; label: string; section: string; min?: number; max?: number; suffix?: string }
  | { kind: "font"; key: keyof AppConfigThemeTokens; label: string; section: string }
  | { kind: "mode"; key: keyof AppConfigThemeTokens; label: string; section: string }
  | { kind: "curve"; key: keyof AppConfigThemeTokens; label: string; section: string };

const FONT_OPTIONS = ["Inter", "Roboto", "Poppins", "Playfair Display", "Manrope", "SF Pro", "System"];
const CURVE_OPTIONS = ["linear", "easeIn", "easeOut", "easeInOut", "spring"];

const THEME_ROWS: ThemeRow[] = [
  { kind: "mode", key: "mode", label: "Mode (light/dark)", section: "Mode" },
  { kind: "color", key: "primary", label: "Primary", section: "Colors" },
  { kind: "color", key: "surface", label: "Surface", section: "Colors" },
  { kind: "color", key: "text", label: "Text", section: "Colors" },
  { kind: "color", key: "textMuted", label: "Text Muted", section: "Colors" },
  { kind: "color", key: "gradientPrimaryStart", label: "Gradient Primary Start", section: "Colors" },
  { kind: "color", key: "gradientPrimaryEnd", label: "Gradient Primary End", section: "Colors" },
  { kind: "color", key: "gradientHeroStart", label: "Gradient Hero Start", section: "Colors" },
  { kind: "color", key: "gradientHeroEnd", label: "Gradient Hero End", section: "Colors" },
  { kind: "color", key: "darkPrimary", label: "Dark Primary", section: "Dark Mode" },
  { kind: "color", key: "darkSurface", label: "Dark Surface", section: "Dark Mode" },
  { kind: "color", key: "darkText", label: "Dark Text", section: "Dark Mode" },
  { kind: "color", key: "darkTextMuted", label: "Dark Text Muted", section: "Dark Mode" },
  { kind: "font", key: "font", label: "Font Family", section: "Typography" },
  { kind: "num", key: "fontSizeXs", label: "Font Size XS", section: "Typography", min: 8, max: 24, suffix: "px" },
  { kind: "num", key: "fontSizeSm", label: "Font Size SM", section: "Typography", min: 8, max: 24, suffix: "px" },
  { kind: "num", key: "fontSizeMd", label: "Font Size MD", section: "Typography", min: 10, max: 32, suffix: "px" },
  { kind: "num", key: "fontSizeLg", label: "Font Size LG", section: "Typography", min: 12, max: 40, suffix: "px" },
  { kind: "num", key: "fontSizeXl", label: "Font Size XL", section: "Typography", min: 14, max: 48, suffix: "px" },
  { kind: "num", key: "fontSize2xl", label: "Font Size 2XL", section: "Typography", min: 16, max: 64, suffix: "px" },
  { kind: "num", key: "letterSpacing", label: "Letter Spacing", section: "Typography", min: -2, max: 10, suffix: "px" },
  { kind: "num", key: "radius", label: "Default Radius", section: "Shape", min: 0, max: 48, suffix: "px" },
  { kind: "num", key: "radiusSm", label: "Radius SM", section: "Shape", min: 0, max: 32, suffix: "px" },
  { kind: "num", key: "radiusMd", label: "Radius MD", section: "Shape", min: 0, max: 32, suffix: "px" },
  { kind: "num", key: "radiusLg", label: "Radius LG", section: "Shape", min: 0, max: 32, suffix: "px" },
  { kind: "num", key: "radiusXl", label: "Radius XL", section: "Shape", min: 0, max: 48, suffix: "px" },
  { kind: "num", key: "spacingSm", label: "Spacing SM", section: "Shape", min: 2, max: 48, suffix: "px" },
  { kind: "num", key: "spacingMd", label: "Spacing MD", section: "Shape", min: 2, max: 48, suffix: "px" },
  { kind: "num", key: "spacingLg", label: "Spacing LG", section: "Shape", min: 2, max: 64, suffix: "px" },
  { kind: "num", key: "motionFast", label: "Motion Fast", section: "Motion", min: 0, max: 1000, suffix: "ms" },
  { kind: "num", key: "motionNormal", label: "Motion Normal", section: "Motion", min: 0, max: 1500, suffix: "ms" },
  { kind: "num", key: "motionSlow", label: "Motion Slow", section: "Motion", min: 0, max: 2000, suffix: "ms" },
  { kind: "curve", key: "motionCurve", label: "Motion Curve", section: "Motion" },
];

function ThemeLivePreview({ t }: { t: AppConfigThemeTokens }) {
  const mode = String(t.mode ?? "light");
  const isDark = mode === "dark";
  const surface = isDark ? String(t.darkSurface ?? "#0F172A") : String(t.surface ?? "#FFFFFF");
  const text = isDark ? String(t.darkText ?? "#F1F5F9") : String(t.text ?? "#1F2937");
  const muted = isDark ? String(t.darkTextMuted ?? "#94A3B8") : String(t.textMuted ?? "#64748B");
  const primary = isDark ? String(t.darkPrimary ?? "#FF7A3F") : String(t.primary ?? "#FF5A1F");
  const r = Number(t.radius ?? 16);
  const rSm = Number(t.radiusSm ?? 8);
  const rMd = Number(t.radiusMd ?? 12);
  const grad = `linear-gradient(135deg, ${String(t.gradientPrimaryStart ?? primary)}, ${String(t.gradientPrimaryEnd ?? "#FFB400")})`;
  const font = String(t.font ?? "Inter") + ", system-ui, sans-serif";
  const sizeMd = Number(t.fontSizeMd ?? 16);
  const sizeLg = Number(t.fontSizeLg ?? 20);
  const sizeXs = Number(t.fontSizeXs ?? 12);
  const motion = `${Number(t.motionNormal ?? 250)}ms`;
  return (
    <div className="rounded-2xl p-5 border" style={{ background: surface, color: text, borderColor: `${text}20`, fontFamily: font, transition: `all ${motion}` }}>
      <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: muted }}>Canlı Önizleme ({mode})</div>
      <h3 className="font-bold mb-1" style={{ fontSize: sizeLg, color: text }}>Başlık (heading)</h3>
      <p className="mb-4" style={{ fontSize: sizeMd, color: muted }}>Gövde metni Lorem ipsum dolor sit amet.</p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button style={{ background: grad, color: "#fff", borderRadius: r, padding: "8px 14px", fontSize: sizeMd, fontWeight: 700, transition: `all ${motion}` }}>Primary</button>
        <button style={{ background: "transparent", color: primary, borderRadius: r, padding: "8px 14px", fontSize: sizeMd, fontWeight: 600, border: `2px solid ${primary}` }}>Secondary</button>
        <span style={{ background: `${primary}15`, color: primary, borderRadius: rSm, padding: "3px 8px", fontSize: sizeXs, fontWeight: 700 }}>✓ Doğrulanmış</span>
        <span style={{ background: `${text}10`, color: text, borderRadius: 999, padding: "3px 10px", fontSize: sizeXs }}>chip</span>
      </div>
      <div className="p-3 mb-2" style={{ background: `${primary}08`, border: `1px solid ${primary}30`, borderRadius: rMd }}>
        <div className="text-xs font-bold" style={{ color: primary }}>Glass card</div>
        <div className="text-[11px] mt-0.5" style={{ color: muted }}>Marka renginden türetilmiş kart yüzeyi</div>
      </div>
      <div className="p-3" style={{ background: surface, border: `1px solid ${text}15`, borderRadius: rMd, fontSize: sizeXs, color: muted }}>
        caption — küçük metin
      </div>
    </div>
  );
}

function ThemeTab({ flash }: { flash: (k: "ok" | "err", t: string) => void }) {
  const [tokens, setTokens] = useState<AppConfigThemeTokens>(DEFAULT_THEME_TOKENS);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<string>("Colors");

  const load = useCallback(async () => {
    try {
      const data = await api.getAdminAppConfig();
      const active = data.themes?.find((t) => t.isActive) ?? data.themes?.[0];
      if (active) {
        setActiveThemeId(active.id);
        setTokens({ ...DEFAULT_THEME_TOKENS, ...active.tokens });
      }
    } catch { /* defaults */ }
  }, []);

  useEffect(() => { const id = setTimeout(() => { void load(); }, 0); return () => clearTimeout(id); }, [load]);

  const setToken = (k: keyof AppConfigThemeTokens, v: string | number) =>
    setTokens((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (activeThemeId) await api.patchTheme(activeThemeId, { tokens });
      else {
        const created = await api.postTheme({ name: "Default", tokens, isActive: true });
        setActiveThemeId(created.id);
      }
      flash("ok", "Tema kaydedildi ✓");
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setSaving(false); }
  };

  const sections = useMemo(() => Array.from(new Set(THEME_ROWS.map((r) => r.section))), []);
  const visibleRows = useMemo(() => THEME_ROWS.filter((r) => r.section === section), [section]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: 2 cols — row list */}
      <div className="lg:col-span-2 space-y-4">
        <GlassCard>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-white">🎨 Tema Tokenları</h3>
            <button onClick={() => void save()} disabled={saving}
              className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 transition-colors">
              {saving ? "Kaydediliyor…" : "💾 Kaydet"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {sections.map((s) => (
              <button key={s} onClick={() => setSection(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${section === s ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
            {visibleRows.map((row) => {
              const value = tokens[row.key];
              return (
                <div key={String(row.key)}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{row.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{String(row.key)}</div>
                  </div>

                  {row.kind === "color" && (
                    <div className="flex items-center gap-2">
                      <input type="color" value={String(value ?? "#000000")}
                        onChange={(e) => setToken(row.key, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                      <input type="text" value={String(value ?? "")}
                        onChange={(e) => setToken(row.key, e.target.value)}
                        className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white outline-none focus:border-emerald-400/40" />
                    </div>
                  )}
                  {row.kind === "num" && (
                    <input type="number" value={Number(value ?? 0)} min={row.min} max={row.max}
                      onChange={(e) => setToken(row.key, Number(e.target.value))}
                      className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white outline-none focus:border-emerald-400/40" />
                  )}
                  {row.kind === "font" && (
                    <select value={String(value ?? "Inter")}
                      onChange={(e) => setToken(row.key, e.target.value)}
                      className="w-40 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none">
                      {FONT_OPTIONS.map((f) => <option key={f} value={f} className="bg-slate-900">{f}</option>)}
                    </select>
                  )}
                  {row.kind === "mode" && (
                    <div className="flex gap-1">
                      {(["light", "dark"] as const).map((m) => (
                        <button key={m} onClick={() => setToken(row.key, m)}
                          className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${String(value ?? "light") === m ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-300 border border-white/10"}`}>
                          {m === "light" ? "☀️" : "🌙"} {m}
                        </button>
                      ))}
                    </div>
                  )}
                  {row.kind === "curve" && (
                    <select value={String(value ?? "easeOut")}
                      onChange={(e) => setToken(row.key, e.target.value)}
                      className="w-32 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none">
                      {CURVE_OPTIONS.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Right: preview */}
      <div className="space-y-4">
        <GlassCard>
          <h3 className="text-sm font-bold text-white mb-3">Live Preview</h3>
          <ThemeLivePreview t={tokens} />
        </GlassCard>
      </div>
    </div>
  );
}

// ─── Branding tab ────────────────────────────────────────────────────────

type BrandingField = {
  key: keyof AppConfigBranding;
  label: string;
  kind: "text" | "logo" | "icon" | "splash";
};

const BRANDING_FIELDS: BrandingField[] = [
  { key: "appTitle", label: "Uygulama Adı", kind: "text" },
  { key: "logoUrl", label: "Logo URL", kind: "logo" },
  { key: "iconUrl", label: "Icon URL", kind: "icon" },
  { key: "splashUrl", label: "Splash URL", kind: "splash" },
];

function BrandingTab({ flash }: { flash: (k: "ok" | "err", t: string) => void }) {
  const [branding, setBranding] = useState<AppConfigBranding>(DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const data = await api.getAdminAppConfig();
      if (data.branding) setBranding({ ...DEFAULT_BRANDING, ...data.branding });
    } catch { /* defaults */ }
  }, []);

  useEffect(() => { const id = setTimeout(() => { void load(); }, 0); return () => clearTimeout(id); }, [load]);

  const set = (k: keyof AppConfigBranding, v: string) => setBranding((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try { await api.patchBranding(branding); flash("ok", "Markalama kaydedildi ✓"); }
    catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setSaving(false); }
  };

  const handleFile = async (kind: "logo" | "icon" | "splash", fieldKey: keyof AppConfigBranding, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { flash("err", "Sadece resim dosyası"); return; }
    if (file.size > 5 * 1024 * 1024) { flash("err", "Dosya 5MB'tan büyük"); return; }
    setUploads((p) => ({ ...p, [kind]: true }));
    try {
      const out = await api.uploadBranding(file, kind);
      set(fieldKey, out.url);
      flash("ok", `${kind} yüklendi ✓`);
    } catch (e) { flash("err", e instanceof Error ? e.message : "Yükleme başarısız"); }
    finally {
      setUploads((p) => ({ ...p, [kind]: false }));
      const ref = inputRefs.current[kind];
      if (ref) ref.value = "";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: row list */}
      <div className="lg:col-span-2 space-y-4">
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">🏷️ Marka Alanları</h3>
            <button onClick={() => void save()} disabled={saving}
              className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5">
              {saving ? "Kaydediliyor…" : "💾 Kaydet"}
            </button>
          </div>

          <div className="space-y-2">
            {BRANDING_FIELDS.map((f) => {
              const value = (branding[f.key] ?? "") as string;
              const filled = !!value.trim();
              const isUpload = f.kind !== "text";
              return (
                <div key={String(f.key)}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                  {/* Toggle: filled=kullan, empty=varsayılan */}
                  <label className="inline-flex items-center cursor-pointer shrink-0" title={filled ? "Kullan" : "Varsayılan"}>
                    <input type="checkbox" className="sr-only peer" checked={filled} readOnly />
                    <div className={`w-9 h-5 rounded-full relative transition-colors ${filled ? "bg-emerald-500" : "bg-slate-700"}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${filled ? "translate-x-4" : ""}`} />
                    </div>
                  </label>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{f.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{String(f.key)}</div>
                  </div>

                  <input type="text" value={value}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.kind === "text" ? "Uygulama adı…" : "https://…"}
                    className="flex-1 max-w-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white outline-none focus:border-emerald-400/40" />

                  {isUpload && (
                    <>
                      <button type="button"
                        onClick={() => inputRefs.current[f.kind]?.click()}
                        disabled={uploads[f.kind]}
                        className="shrink-0 px-2 py-1 rounded bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/25 disabled:opacity-50">
                        {uploads[f.kind] ? "…" : "📤"}
                      </button>
                      <input
                        ref={(el) => { inputRefs.current[f.kind] = el; }}
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => void handleFile(f.kind as "logo" | "icon" | "splash", f.key, e.target.files?.[0] ?? null)}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Right: phone mockup */}
      <div className="space-y-4">
        <GlassCard>
          <h3 className="text-sm font-bold text-white mb-3">📱 Önizleme</h3>
          <div className="bg-slate-950 rounded-3xl border-4 border-slate-800 p-4 max-w-[280px] mx-auto aspect-[9/16] flex flex-col items-center justify-center gap-4">
            {branding.splashUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.splashUrl} alt="splash" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-20" />
            ) : null}
            {branding.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.iconUrl} alt="icon" className="w-20 h-20 rounded-2xl shadow-2xl"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-3xl">📱</div>
            )}
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="logo" className="h-8 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="text-lg font-bold text-white">{branding.appTitle ?? "Yapgitsin"}</div>
            )}
            <div className="text-[10px] text-slate-500">preview</div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ─── Profile-Card tab (Phase 272 lift) ───────────────────────────────────

const PROFILE_FIELDS = [
  { key: "averageRating", defaultLabel: "Ortalama Puan", hint: "5 üzerinden yıldız" },
  { key: "reviewsCount", defaultLabel: "Yorum Sayısı", hint: "totalReviews" },
  { key: "jobsCount", defaultLabel: "İş Sayısı", hint: "asWorkerTotal / asCustomerTotal" },
  { key: "completionRate", defaultLabel: "Tamamlama Oranı", hint: "% başarı" },
  { key: "reputationScore", defaultLabel: "İtibar Puanı", hint: "reputationScore" },
  { key: "badges", defaultLabel: "Rozetler", hint: "auto + manuel" },
  { key: "verifiedBadge", defaultLabel: "Doğrulanmış Rozeti", hint: "identityVerified" },
  { key: "premiumLabel", defaultLabel: "Premium Etiketi", hint: "Premium üyelik" },
  { key: "workerSkills", defaultLabel: "Yetenekler", hint: "workerSkills tag" },
  { key: "portfolioPhotos", defaultLabel: "Portfolyo", hint: "Geçmiş işler" },
];

const PROFILE_SCREEN = "profile_card";
type ProfileFieldState = Record<string, { visible: boolean; label: string }>;

function defaultProfileState(): ProfileFieldState {
  const out: ProfileFieldState = {};
  for (const f of PROFILE_FIELDS) out[f.key] = { visible: true, label: "" };
  return out;
}

function ProfileCardTab({ flash }: { flash: (k: "ok" | "err", t: string) => void }) {
  const [state, setState] = useState<ProfileFieldState>(defaultProfileState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await api.getAdminAppConfig();
      const screen = cfg.layouts.find((l) => l.screen === PROFILE_SCREEN);
      const next = defaultProfileState();
      if (screen) {
        for (const it of screen.items) {
          if (!(it.key in next)) continue;
          const label = it.props && typeof it.props.label === "string" ? (it.props.label as string) : "";
          next[it.key] = { visible: it.visible !== false, label };
        }
      }
      setState(next);
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setLoading(false); }
  }, [flash]);

  useEffect(() => { const id = setTimeout(() => { void load(); }, 0); return () => clearTimeout(id); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const items: AppConfigLayoutItem[] = PROFILE_FIELDS.map((f) => {
        const s = state[f.key];
        const props: Record<string, unknown> = {};
        if (s.label.trim()) props.label = s.label.trim();
        return { key: f.key, visible: s.visible, props };
      });
      await api.putLayout(PROFILE_SCREEN, items);
      flash("ok", "Profil kartı kaydedildi ✓");
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setSaving(false); }
  };

  const toggleAll = (visible: boolean) => {
    setState((p) => {
      const next: ProfileFieldState = {};
      for (const k of Object.keys(p)) next[k] = { ...p[k], visible };
      return next;
    });
  };

  const preview = useMemo(() => {
    const labelFor = (key: string) => {
      const f = PROFILE_FIELDS.find((x) => x.key === key)!;
      return state[key]?.label.trim() || f.defaultLabel;
    };
    const on = (key: string) => state[key]?.visible !== false;
    return { labelFor, on };
  }, [state]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <GlassCard>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-bold text-white">👤 Profil Kartı Alanları</h3>
            <div className="flex gap-2">
              <button onClick={() => toggleAll(true)} className="rounded-md bg-white/5 hover:bg-white/10 text-white text-xs font-medium px-3 py-1.5">Tümü Aç</button>
              <button onClick={() => toggleAll(false)} className="rounded-md bg-white/5 hover:bg-white/10 text-white text-xs font-medium px-3 py-1.5">Tümü Kapat</button>
              <button onClick={() => void save()} disabled={saving || loading}
                className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5">
                {saving ? "Kaydediliyor…" : "💾 Kaydet"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-400 py-6 text-center">Yükleniyor…</div>
          ) : (
            <div className="space-y-2">
              {PROFILE_FIELDS.map((f) => {
                const s = state[f.key];
                return (
                  <div key={f.key}
                    className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                    <label className="inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" className="sr-only peer" checked={s.visible}
                        onChange={(e) => setState((p) => ({ ...p, [f.key]: { ...p[f.key], visible: e.target.checked } }))} />
                      <div className="w-9 h-5 bg-slate-700 peer-checked:bg-emerald-500 rounded-full relative transition-colors">
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${s.visible ? "translate-x-4" : ""}`} />
                      </div>
                    </label>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white">{f.defaultLabel}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{f.key} · {f.hint}</div>
                    </div>
                    <input type="text" placeholder="(varsayılan)" value={s.label}
                      onChange={(e) => setState((p) => ({ ...p, [f.key]: { ...p[f.key], label: e.target.value } }))}
                      className="w-48 bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/50" />
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="space-y-4">
        <GlassCard>
          <h3 className="text-sm font-bold text-white mb-3">Önizleme</h3>
          <div className="bg-slate-900 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">EK</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="text-sm font-bold text-white truncate">Emre Kaya</div>
                  {preview.on("verifiedBadge") && <span title={preview.labelFor("verifiedBadge")} className="text-blue-400 text-xs">✓</span>}
                  {preview.on("premiumLabel") && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5">{preview.labelFor("premiumLabel")}</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">Elektrikçi · İstanbul</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {preview.on("averageRating") && (
                <div className="bg-white/5 rounded-lg py-2"><div className="text-sm font-bold text-amber-400">★ 4.8</div><div className="text-[10px] text-slate-400">{preview.labelFor("averageRating")}</div></div>
              )}
              {preview.on("reviewsCount") && (
                <div className="bg-white/5 rounded-lg py-2"><div className="text-sm font-bold text-white">42</div><div className="text-[10px] text-slate-400">{preview.labelFor("reviewsCount")}</div></div>
              )}
              {preview.on("jobsCount") && (
                <div className="bg-white/5 rounded-lg py-2"><div className="text-sm font-bold text-white">128</div><div className="text-[10px] text-slate-400">{preview.labelFor("jobsCount")}</div></div>
              )}
              {preview.on("completionRate") && (
                <div className="bg-white/5 rounded-lg py-2"><div className="text-sm font-bold text-emerald-400">%96</div><div className="text-[10px] text-slate-400">{preview.labelFor("completionRate")}</div></div>
              )}
              {preview.on("reputationScore") && (
                <div className="bg-white/5 rounded-lg py-2"><div className="text-sm font-bold text-orange-400">110</div><div className="text-[10px] text-slate-400">{preview.labelFor("reputationScore")}</div></div>
              )}
            </div>
            {preview.on("badges") && (
              <div>
                <div className="text-[10px] text-slate-400 mb-1">{preview.labelFor("badges")}</div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5">Top Rated</span>
                  <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-full px-2 py-0.5">Responsive</span>
                </div>
              </div>
            )}
            {preview.on("workerSkills") && (
              <div>
                <div className="text-[10px] text-slate-400 mb-1">{preview.labelFor("workerSkills")}</div>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 rounded-full px-2 py-0.5">Tesisat</span>
                  <span className="text-[10px] bg-white/5 text-slate-300 border border-white/10 rounded-full px-2 py-0.5">Kaynak</span>
                </div>
              </div>
            )}
            {preview.on("portfolioPhotos") && (
              <div>
                <div className="text-[10px] text-slate-400 mb-1">{preview.labelFor("portfolioPhotos")}</div>
                <div className="flex gap-1">
                  <div className="w-12 h-12 bg-slate-700 rounded" />
                  <div className="w-12 h-12 bg-slate-700 rounded" />
                  <div className="w-12 h-12 bg-slate-700 rounded" />
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ─── Backup tab (Phase 272 lift) ─────────────────────────────────────────

interface BackupRow { filename: string; size: number; createdAt: string; }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function formatBackupDate(iso: string): string {
  try { return new Date(iso).toLocaleString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
function todayToken(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function BackupTab({ flash }: { flash: (k: "ok" | "err", t: string) => void }) {
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState("");

  const refresh = useCallback(async () => {
    try { setLoading(true); setRows(await api.listBackups()); }
    catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setLoading(false); }
  }, [flash]);

  useEffect(() => { const id = setTimeout(() => { void refresh(); }, 0); return () => clearTimeout(id); }, [refresh]);

  const onCreate = async () => {
    setBusy("create");
    try { const out = await api.createBackup(); flash("ok", `Yedek alındı: ${out.filename}`); await refresh(); }
    catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setBusy(null); }
  };
  const onDownload = async (filename: string) => {
    setBusy(`dl-${filename}`);
    try { await api.downloadBackup(filename); }
    catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setBusy(null); }
  };
  const onRestoreConfirm = async () => {
    if (!restoreTarget) return;
    setBusy(`restore-${restoreTarget}`);
    try {
      const out = await api.restoreBackup(restoreTarget, confirmInput.trim());
      flash("ok", `Geri yüklendi: ${out.restoredFrom}. ${out.note}`);
      setRestoreTarget(null); setConfirmInput("");
      await refresh();
    } catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setBusy(null); }
  };
  const onDelete = async (filename: string) => {
    if (!confirm(`'${filename}' silinsin mi?`)) return;
    setBusy(`del-${filename}`);
    try { await api.deleteBackup(filename); flash("ok", "Silindi"); await refresh(); }
    catch (e) { flash("err", e instanceof Error ? e.message : "Hata"); }
    finally { setBusy(null); }
  };

  const last = rows[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: backup list (rows) */}
      <div className="lg:col-span-2 space-y-4">
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">💾 Yedek Listesi ({rows.length})</h3>
            <button onClick={() => void refresh()} className="text-xs px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200">↻ Yenile</button>
          </div>
          {loading ? (
            <div className="text-sm text-slate-400 py-6 text-center">Yükleniyor…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">Henüz yedek yok. Sağ panelden ilk yedeği al.</div>
          ) : (
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {rows.map((r) => (
                <div key={r.filename}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center text-lg shrink-0">📦</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-white truncate">{r.filename}</div>
                    <div className="text-[10px] text-slate-400">{formatBackupDate(r.createdAt)} · {formatSize(r.size)}</div>
                  </div>
                  <button onClick={() => void onDownload(r.filename)} disabled={busy === `dl-${r.filename}`}
                    className="rounded-md bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1.5">İndir</button>
                  <button onClick={() => { setRestoreTarget(r.filename); setConfirmInput(""); }}
                    className="rounded-md border border-red-500/60 text-red-200 hover:bg-red-500/15 text-xs font-medium px-2.5 py-1.5">↻ Geri Yükle</button>
                  <button onClick={() => void onDelete(r.filename)} disabled={busy === `del-${r.filename}`}
                    className="rounded-md bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1.5">Sil</button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Right: action panel */}
      <div className="space-y-4">
        <GlassCard>
          <h3 className="text-sm font-bold text-white mb-3">Yedek Aksiyon</h3>
          <button onClick={() => void onCreate()} disabled={busy === "create"}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-3 mb-3">
            {busy === "create" ? "Alınıyor…" : "📦 Yedek Al"}
          </button>
          {last && (
            <div className="text-[11px] text-slate-300 bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
              <div className="font-semibold text-white">Son yedek</div>
              <div className="font-mono mt-1 truncate">{last.filename}</div>
              <div className="text-slate-400 mt-1">{formatBackupDate(last.createdAt)} · {formatSize(last.size)}</div>
            </div>
          )}
          <div className="text-[11px] text-blue-100 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            🤖 <b>Otomatik:</b> günde 1 yedek (son <b>7</b> tutulur). Geri yükleme öncesi otomatik pre-restore snapshot alınır.
          </div>
        </GlassCard>
      </div>

      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm" onClick={() => setRestoreTarget(null)}>
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-red-200">⚠️ Yedeği Geri Yükle</h3>
            <p className="mt-2 text-xs text-slate-300">
              Mevcut DB <code className="text-red-300">{restoreTarget}</code> ile değiştirilecek. Onay için <b>bugünün tarihini</b> yaz (YYYYMMDD): <code className="text-yellow-200">{todayToken()}</code>
            </p>
            <input type="text" value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={todayToken()} autoFocus
              className="mt-3 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono text-white focus:border-red-500/50 outline-none" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRestoreTarget(null)} className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10">İptal</button>
              <button onClick={() => void onRestoreConfirm()}
                disabled={busy === `restore-${restoreTarget}` || confirmInput.trim() !== todayToken()}
                className="rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5">
                {busy === `restore-${restoreTarget}` ? "Geri yükleniyor…" : "↻ Geri Yükle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Page shell
// ═══════════════════════════════════════════════════════════════════════════

export default function ApkIcerikPage() {
  const router = useRouter();
  const params = useSearchParams();

  // URL is the single source of truth for ?tab=xxx — derive, don't duplicate
  // (prior useState + useEffect sync raced with router.replace and snapped tab back)
  const tab = useMemo<Tab>(() => {
    const t = params.get("tab");
    return t && (VALID_TABS as string[]).includes(t) ? (t as Tab) : "pages";
  }, [params]);

  const switchTab = useCallback((k: Tab) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", k);
    router.replace(`${url.pathname}${url.search}`);
  }, [router]);

  const [data, setData] = useState<AdminAppConfig | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const flash = useCallback((kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const load = useCallback(async () => {
    try { setData(await api.getAdminAppConfig()); }
    catch { setData({ branding: {}, themes: [], settings: [], layouts: [], visibility: [] }); }
  }, []);

  useEffect(() => { const id = setTimeout(() => { void load(); }, 0); return () => clearTimeout(id); }, [load]);

  const settings = useMemo(() => data?.settings ?? [], [data]);
  const layouts  = useMemo(() => data?.layouts  ?? [], [data]);
  const rules    = useMemo(() => data?.visibility ?? [], [data]);

  return (
    <div className="min-h-full -m-6 p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📦 APK Yönetim Merkezi</h1>
          <p className="text-sm text-slate-400 mt-1">Sayfalar · ayarlar · düzen · görünürlük · popups · tema · markalama · profil kartı · yedek</p>
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

      <div className="flex flex-wrap gap-1 mb-5 p-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xl w-fit">
        {([
          { k: "pages",        l: "📄 Sayfalar" },
          { k: "settings",     l: "⚙️ Ayarlar" },
          { k: "layout",       l: "🧩 Düzen" },
          { k: "visibility",   l: "👁️ Görünürlük" },
          { k: "popups",       l: "💬 Popups & Menus" },
          { k: "theme",        l: "🎨 Tema" },
          { k: "branding",     l: "🏷️ Markalama" },
          { k: "profile-card", l: "👤 Profil Kartı" },
          { k: "backup",       l: "💾 Yedek" },
        ] as { k: Tab; l: string }[]).map(({ k, l }) => (
          <button key={k} onClick={() => switchTab(k)}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${tab === k ? "bg-emerald-500 text-white shadow-md" : "text-slate-300 hover:text-white hover:bg-white/5"}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === "pages"        && <PagesTab        flash={flash} />}
      {tab === "settings"     && <SettingsTab     rows={settings} onChanged={load} flash={flash} />}
      {tab === "layout"       && <LayoutTab       layouts={layouts} onChanged={load} flash={flash} />}
      {tab === "visibility"   && <VisibilityTab   rules={rules} onChanged={load} flash={flash} />}
      {tab === "popups"       && <PopupsTab       layouts={layouts} onChanged={load} flash={flash} />}
      {tab === "theme"        && <ThemeTab        flash={flash} />}
      {tab === "branding"     && <BrandingTab     flash={flash} />}
      {tab === "profile-card" && <ProfileCardTab  flash={flash} />}
      {tab === "backup"       && <BackupTab       flash={flash} />}

      {previewOpen && <ApkPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}
