"use client";

import { use, useEffect, useState } from "react";
import { api, type BlogPost } from "@/lib/api";
import BlogForm from "../../blog-form";

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.blogGet(id)
      .then(setPost)
      .catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, [id]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!post) return <div className="p-6 text-gray-500">Yükleniyor…</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">📝 Yazıyı Düzenle</h1>
      <BlogForm initial={post} />
    </div>
  );
}
