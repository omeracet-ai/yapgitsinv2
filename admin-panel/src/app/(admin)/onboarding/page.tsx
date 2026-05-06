"use client";

import { useEffect, useRef, useState } from "react";
import { api, OnboardingSlide } from "@/lib/api";

// ─── Renk önayarları ──────────────────────────────────────────────────────────
const PRESETS = [
  { label: "Mavi",   start: "#007DFE", end: "#0056B3" },
  { label: "Lacivert", start: "#2D3E50", end: "#1a2530" },
  { label: "Yeşil", start: "#00C9A7", end: "#008f75" },
  { label: "Mor",   start: "#7C3AED", end: "#4C1D95" },
  { label: "Turuncu", start: "#F59E0B", end: "#B45309" },
  { label: "Kırmızı", start: "#EF4444", end: "#991B1B" },
];

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Boş slide formu ─────────────────────────────────────────────────────────
const emptyForm = (): Partial<OnboardingSlide> => ({
  title: "",
  body: "",
  emoji: "🛠️",
  imageUrl: null,
  gradientStart: "#007DFE",
  gradientEnd: "#0056B3",
  isActive: true,
});

export default function OnboardingPage() {
  const [slides, setSlides]       = useState<OnboardingSlide[]>([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState<string | null>(null);
  const [editing, setEditing]     = useState<OnboardingSlide | null>(null);
  const [adding, setAdding]       = useState(false);
  const [form, setForm]           = useState<Partial<OnboardingSlide>>(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      setSlides(await api.onboardingSlides());
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Görsel yükle ────────────────────────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await api.uploadOnboardingImage(file);
      setForm(f => ({ ...f, imageUrl: url }));
    } catch (e) {
      alert("Görsel yükleme hatası: " + String(e));
    } finally {
      setUploading(false);
    }
  };

  // ── Kaydet ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.title?.trim() || !form.body?.trim()) {
      alert("Başlık ve açıklama zorunludur.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.updateOnboardingSlide(editing.id, form);
        setSlides(s => s.map(x => (x.id === updated.id ? updated : x)));
      } else {
        const created = await api.createOnboardingSlide(form);
        setSlides(s => [...s, created]);
      }
      setEditing(null);
      setAdding(false);
      setForm(emptyForm());
    } catch (e) {
      alert("Kaydetme hatası: " + String(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Sil ─────────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Bu slide silinsin mi?")) return;
    try {
      await api.deleteOnboardingSlide(id);
      setSlides(s => s.filter(x => x.id !== id));
    } catch (e) {
      alert("Silme hatası: " + String(e));
    }
  };

  // ── Sırala ──────────────────────────────────────────────────────────────────
  const moveSlide = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setSlides(reordered);
    try {
      await api.reorderOnboardingSlides(reordered.map(s => s.id));
    } catch (e) {
      alert("Sıralama hatası: " + String(e));
      load();
    }
  };

  // ── Aktif toggle ────────────────────────────────────────────────────────────
  const toggleActive = async (slide: OnboardingSlide) => {
    try {
      const updated = await api.updateOnboardingSlide(slide.id, { isActive: !slide.isActive });
      setSlides(s => s.map(x => (x.id === updated.id ? updated : x)));
    } catch (e) {
      alert(String(e));
    }
  };

  const openEdit = (slide: OnboardingSlide) => {
    setEditing(slide);
    setAdding(false);
    setForm({
      title: slide.title,
      body: slide.body,
      emoji: slide.emoji ?? "",
      imageUrl: slide.imageUrl,
      gradientStart: slide.gradientStart,
      gradientEnd: slide.gradientEnd,
      isActive: slide.isActive,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setAdding(false);
    setForm(emptyForm());
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Onboarding Slides</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Uygulamanın ilk açılışta gösterdiği tanıtım ekranları
          </p>
        </div>
        {!adding && !editing && (
          <button
            onClick={() => { setAdding(true); setEditing(null); setForm(emptyForm()); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Slide Ekle
          </button>
        )}
      </div>

      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{err}</div>
      )}

      {/* ── Form ── */}
      {(adding || editing) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-800 mb-5">
            {editing ? "Slide Düzenle" : "Yeni Slide"}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol — form alanları */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Başlık *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title ?? ""}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Usta Bul, Hizmet Al"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Açıklama *</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.body ?? ""}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Kısa açıklama metni..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Emoji <span className="text-gray-400">(görsel yoksa gösterilir)</span>
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.emoji ?? ""}
                  onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  placeholder="🛠️"
                />
              </div>

              {/* Gradient */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Arka Plan Rengi</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setForm(f => ({ ...f, gradientStart: p.start, gradientEnd: p.end }))}
                      className="px-3 py-1.5 rounded-full text-white text-xs font-medium transition-all ring-2 ring-transparent hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${p.start}, ${p.end})`,
                        outline: form.gradientStart === p.start ? "2px solid #000" : "none",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Başlangıç</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.gradientStart ?? "#007DFE"}
                        onChange={e => setForm(f => ({ ...f, gradientStart: e.target.value }))}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                      <input className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                        value={form.gradientStart ?? ""}
                        onChange={e => setForm(f => ({ ...f, gradientStart: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">Bitiş</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.gradientEnd ?? "#0056B3"}
                        onChange={e => setForm(f => ({ ...f, gradientEnd: e.target.value }))}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                      <input className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs font-mono"
                        value={form.gradientEnd ?? ""}
                        onChange={e => setForm(f => ({ ...f, gradientEnd: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Aktif toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`w-10 h-6 rounded-full transition-colors relative ${form.isActive ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? "left-5" : "left-1"}`} />
                </div>
                <span className="text-sm text-gray-700">Aktif</span>
              </label>
            </div>

            {/* Sağ — önizleme + görsel yükleme */}
            <div className="space-y-4">
              {/* Önizleme */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Önizleme</label>
                <div
                  className="rounded-2xl overflow-hidden h-52 flex flex-col items-center justify-center text-white relative"
                  style={{ background: `linear-gradient(135deg, ${form.gradientStart}, ${form.gradientEnd})` }}
                >
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                  ) : null}
                  <div className="relative z-10 text-center px-6">
                    <div className="text-5xl mb-3">{form.emoji || "🛠️"}</div>
                    <div className="text-lg font-bold leading-tight mb-2">{form.title || "Başlık"}</div>
                    <div className="text-xs text-white/75 leading-relaxed">{form.body || "Açıklama..."}</div>
                  </div>
                </div>
              </div>

              {/* Görsel yükleme */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Görsel <span className="text-gray-400">(opsiyonel, emoji ile birleşir)</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = "";
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 border-2 border-dashed border-gray-200 rounded-lg py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                  >
                    {uploading ? "Yükleniyor…" : "📎 Görsel Seç"}
                  </button>
                  {form.imageUrl && (
                    <button
                      onClick={() => setForm(f => ({ ...f, imageUrl: null }))}
                      className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50"
                    >
                      Kaldır
                    </button>
                  )}
                </div>
                {form.imageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden h-24 bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Kaydediliyor…" : editing ? "Güncelle" : "Ekle"}
            </button>
            <button
              onClick={cancelEdit}
              className="px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* ── Slide listesi ── */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Yükleniyor…</div>
      ) : slides.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Henüz slide eklenmemiş.</div>
      ) : (
        <div className="grid gap-4">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-opacity ${!slide.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex">
                {/* Renkli şerit + önizleme */}
                <div
                  className="w-32 shrink-0 flex flex-col items-center justify-center text-white p-4"
                  style={{ background: `linear-gradient(135deg, ${slide.gradientStart}, ${slide.gradientEnd})` }}
                >
                  {slide.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.imageUrl}
                         alt=""
                         className="w-16 h-16 object-cover rounded-xl mb-1 opacity-90"
                    />
                  ) : (
                    <span className="text-4xl">{slide.emoji ?? "🛠️"}</span>
                  )}
                  <span className="text-[10px] text-white/70 mt-1">#{i + 1}</span>
                </div>

                {/* İçerik */}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{slide.title}</span>
                        {!slide.isActive && (
                          <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Pasif</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{slide.body}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full" style={{ background: slide.gradientStart }} />
                          <div className="w-3 h-3 rounded-full" style={{ background: slide.gradientEnd }} />
                          <span className="text-[10px] text-gray-400 font-mono">{slide.gradientStart}</span>
                        </div>
                        {slide.imageUrl && <span className="text-[10px] text-blue-500">🖼 Görsel var</span>}
                      </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Sırala */}
                      <button onClick={() => moveSlide(i, -1)} disabled={i === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors" title="Yukarı">
                        ↑
                      </button>
                      <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors" title="Aşağı">
                        ↓
                      </button>

                      {/* Aktif toggle */}
                      <button onClick={() => toggleActive(slide)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                          slide.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}>
                        {slide.isActive ? "Aktif" : "Pasif"}
                      </button>

                      {/* Düzenle */}
                      <button onClick={() => openEdit(slide)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                        Düzenle
                      </button>

                      {/* Sil */}
                      <button onClick={() => handleDelete(slide.id)}
                        className="px-3 py-1 text-sm bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
