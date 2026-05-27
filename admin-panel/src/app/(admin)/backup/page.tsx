"use client";

/**
 * /backup — SQLite DB backup manager.
 * - "Yedek Al" CTA → POST /admin/backup/create
 * - List with download / delete / restore actions
 * - Restore: BUGÜNÜN tarihi (YYYYMMDD) confirm token + pre-restore snapshot.
 * - Otomatik: günde 1 kez (server-side scheduler, son 7 saklanır).
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface BackupRow {
  filename: string;
  size: number;
  createdAt: string;
}

function GlassCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function todayToken(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export default function BackupPage() {
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ k: "ok" | "err"; t: string } | null>(
    null,
  );
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const list = await api.listBackups();
      setRows(list);
    } catch (e) {
      setFlash({ k: "err", t: e instanceof Error ? e.message : "Hata" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreate = async () => {
    try {
      setBusy("create");
      const out = await api.createBackup();
      setFlash({ k: "ok", t: `Yedek alındı: ${out.filename}` });
      await refresh();
    } catch (e) {
      setFlash({ k: "err", t: e instanceof Error ? e.message : "Hata" });
    } finally {
      setBusy(null);
    }
  };

  const onDownload = async (filename: string) => {
    try {
      setBusy(`dl-${filename}`);
      await api.downloadBackup(filename);
    } catch (e) {
      setFlash({ k: "err", t: e instanceof Error ? e.message : "Hata" });
    } finally {
      setBusy(null);
    }
  };

  const openRestore = (filename: string) => {
    setRestoreTarget(filename);
    setConfirmInput("");
  };

  const closeRestore = () => {
    setRestoreTarget(null);
    setConfirmInput("");
  };

  const onRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      setBusy(`restore-${restoreTarget}`);
      const out = await api.restoreBackup(restoreTarget, confirmInput.trim());
      setFlash({
        k: "ok",
        t: `Geri yüklendi: ${out.restoredFrom}. ${out.note}`,
      });
      closeRestore();
      await refresh();
    } catch (e) {
      setFlash({ k: "err", t: e instanceof Error ? e.message : "Hata" });
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (filename: string) => {
    if (!confirm(`'${filename}' silinsin mi?`)) return;
    try {
      setBusy(`del-${filename}`);
      await api.deleteBackup(filename);
      setFlash({ k: "ok", t: "Yedek silindi" });
      await refresh();
    } catch (e) {
      setFlash({ k: "err", t: e instanceof Error ? e.message : "Hata" });
    } finally {
      setBusy(null);
    }
  };

  const last = rows[0];

  return (
    <div className="space-y-4">
      {flash && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            flash.k === "ok"
              ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
              : "bg-red-500/15 text-red-200 border border-red-500/30"
          }`}
        >
          {flash.t}
        </div>
      )}

      <GlassCard
        title="💾 Veritabanı Yedekleme"
        subtitle={
          last
            ? `Son yedek: ${formatDate(last.createdAt)} · ${formatSize(last.size)}`
            : "Henüz yedek alınmadı"
        }
        actions={
          <button
            type="button"
            onClick={onCreate}
            disabled={busy === "create"}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            {busy === "create" ? "Alınıyor…" : "📦 Yedek Al"}
          </button>
        }
      >
        <p className="text-xs text-slate-400">
          SQLite veritabanı dosyası <code className="text-slate-300">backups/</code>{" "}
          klasörüne kopyalanır. Geri yükleme satır içi <b>↻ Geri Yükle</b>{" "}
          butonu ile yapılır (önce otomatik pre-restore snapshot alınır).
        </p>
        <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[11px] text-blue-100">
          🤖 Otomatik yedekleme: <b>günde 1 kez</b> (sunucu uptime'a bağlı, son{" "}
          <b>7 yedek</b> tutulur, eskiler silinir).
        </div>
      </GlassCard>

      <GlassCard title="Yedek Listesi" subtitle={`${rows.length} kayıt`}>
        {loading ? (
          <div className="text-sm text-slate-400 py-6 text-center">
            Yükleniyor…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-slate-400 py-6 text-center">
            Henüz yedek yok. Üstteki butonla ilk yedeği al.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-white/10">
                  <th className="py-2 pr-3 font-semibold">Dosya</th>
                  <th className="py-2 pr-3 font-semibold">Boyut</th>
                  <th className="py-2 pr-3 font-semibold">Oluşturulma</th>
                  <th className="py-2 pr-3 font-semibold text-right">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.filename}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/5"
                  >
                    <td className="py-2 pr-3 font-mono text-xs text-white">
                      {r.filename}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      {formatSize(r.size)}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => onDownload(r.filename)}
                          disabled={busy === `dl-${r.filename}`}
                          className="rounded-md bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 transition-colors"
                        >
                          İndir
                        </button>
                        <button
                          type="button"
                          onClick={() => openRestore(r.filename)}
                          disabled={busy === `restore-${r.filename}`}
                          className="rounded-md border border-red-500/60 text-red-200 hover:bg-red-500/15 disabled:opacity-50 text-xs font-medium px-3 py-1.5 transition-colors"
                          title="Mevcut DB üzerine bu yedeği yaz"
                        >
                          ↻ Geri Yükle
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(r.filename)}
                          disabled={busy === `del-${r.filename}`}
                          className="rounded-md bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {restoreTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          onClick={closeRestore}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-red-200">
              ⚠️ Yedeği Geri Yükle
            </h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Mevcut veritabanı <code className="text-red-300">{restoreTarget}</code>{" "}
              ile değiştirilecek. Güvenlik için önce mevcut DB'nin{" "}
              <b>pre-restore snapshot</b>'ı alınır. Bu işlemden sonra backend{" "}
              <b>yeniden başlatılmalıdır</b>.
            </p>
            <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-[11px] text-yellow-100">
              Onay için <b>bugünün tarihini</b> yaz (YYYYMMDD):{" "}
              <code className="text-yellow-200">{todayToken()}</code>
            </div>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={todayToken()}
              className="mt-3 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono text-white focus:border-red-500/50 outline-none"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRestore}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={onRestoreConfirm}
                disabled={
                  busy === `restore-${restoreTarget}` ||
                  confirmInput.trim() !== todayToken()
                }
                className="rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-1.5 transition-colors"
              >
                {busy === `restore-${restoreTarget}`
                  ? "Geri yükleniyor…"
                  : "↻ Geri Yükle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
