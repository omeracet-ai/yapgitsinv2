"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type BlogPost } from "@/lib/api";

export default function BlogListPage() {
  const [items, setItems] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "draft" | "published" | "archived">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.blogList(1, 100);
      setItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" silinsin mi?`)) return;
    setBusyId(id);
    try {
      await api.blogDelete(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = filter === "all" ? items : items.filter((p) => p.status === filter);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📝 Blog Yazıları</h1>
        <Link
          href="/blog/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Yeni Yazı
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "draft", "published", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "Tümü" : s === "draft" ? "Taslak" : s === "published" ? "Yayında" : "Arşiv"}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}
      {loading ? (
        <div className="text-gray-500 text-sm">Yükleniyor…</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500 text-sm">Bu filtrede yazı yok.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Başlık</th>
                <th className="text-left px-4 py-2 font-medium">Slug</th>
                <th className="text-left px-4 py-2 font-medium">Durum</th>
                <th className="text-left px-4 py-2 font-medium">Yayın</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{p.title}</td>
                  <td className="px-4 py-2 text-gray-500 font-mono text-xs">{p.slug}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === "published"
                          ? "bg-green-100 text-green-700"
                          : p.status === "draft"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("tr-TR") : "—"}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <Link href={`/blog/edit/${p.id}`} className="text-blue-600 hover:underline">Düzenle</Link>
                    <button
                      onClick={() => handleDelete(p.id, p.title)}
                      disabled={busyId === p.id}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {busyId === p.id ? "Siliniyor…" : "Sil"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
