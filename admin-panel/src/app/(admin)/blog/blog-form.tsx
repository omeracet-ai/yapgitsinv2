"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type BlogPost } from "@/lib/api";

type FormState = {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  tags: string;
  status: "draft" | "published" | "archived";
  publishedAt: string;
};

function fromPost(p?: BlogPost | null): FormState {
  return {
    slug: p?.slug ?? "",
    title: p?.title ?? "",
    content: p?.content ?? "",
    excerpt: p?.excerpt ?? "",
    coverImageUrl: p?.coverImageUrl ?? "",
    tags: (p?.tags ?? []).join(", "),
    status: p?.status ?? "draft",
    publishedAt: p?.publishedAt ? new Date(p.publishedAt).toISOString().slice(0, 16) : "",
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BlogForm({ initial }: { initial?: BlogPost | null }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(fromPost(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        content: form.content,
        excerpt: form.excerpt.trim(),
        coverImageUrl: form.coverImageUrl.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        status: form.status,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      };
      if (initial) {
        await api.blogUpdate(initial.id, payload);
      } else {
        await api.blogCreate(payload);
      }
      router.push("/blog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-3xl">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium mb-1">Başlık</label>
        <input
          required
          value={form.title}
          onChange={(e) => {
            const t = e.target.value;
            update({ title: t, ...(initial ? {} : { slug: form.slug || slugify(t) }) });
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          placeholder="Yazı başlığı"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Slug</label>
        <input
          required
          value={form.slug}
          onChange={(e) => update({ slug: slugify(e.target.value) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
          placeholder="ornek-yazi-slug"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Özet (max 500)</label>
        <textarea
          rows={2}
          maxLength={500}
          value={form.excerpt}
          onChange={(e) => update({ excerpt: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">İçerik (Markdown)</label>
        <textarea
          required
          rows={18}
          value={form.content}
          onChange={(e) => update({ content: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
          placeholder="# Başlık&#10;&#10;Markdown destekli içerik…"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Kapak Resmi URL</label>
        <input
          value={form.coverImageUrl}
          onChange={(e) => update({ coverImageUrl: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="https://…"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Etiketler (virgülle ayır)</label>
        <input
          value={form.tags}
          onChange={(e) => update({ tags: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder="temizlik, ipucu, fiyat"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Durum</label>
          <select
            value={form.status}
            onChange={(e) => update({ status: e.target.value as FormState["status"] })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="draft">Taslak</option>
            <option value="published">Yayında</option>
            <option value="archived">Arşivli</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Yayın Tarihi</label>
          <input
            type="datetime-local"
            value={form.publishedAt}
            onChange={(e) => update({ publishedAt: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? "Kaydediliyor…" : initial ? "Güncelle" : "Oluştur"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/blog")}
          className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          İptal
        </button>
      </div>
    </form>
  );
}
