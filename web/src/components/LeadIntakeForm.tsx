'use client';

import { useState, useEffect } from 'react';
import { getCategories, TR_CITIES } from '@/lib/api';

interface LeadIntakeFormProps {
  categoryPrefill?: string;
  cityPrefill?: string;
  onSuccess?: () => void;
}

export default function LeadIntakeForm({ categoryPrefill, cityPrefill, onSuccess }: LeadIntakeFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    category: categoryPrefill || '',
    city: cityPrefill || '',
    description: '',
    budgetMin: '',
    budgetMax: '',
    budgetVisible: false,
    requesterName: '',
    requesterPhone: '',
    requesterEmail: '',
    preferredContactTime: 'flexible',
  });

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      const cats = await getCategories();
      if (cats) {
        setCategories(cats);
      }
    }
    loadCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.category || !formData.city || !formData.requesterName || !formData.requesterPhone || !formData.requesterEmail) {
        setError('Lütfen tüm zorunlu alanları doldurunuz');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budgetMin: formData.budgetMin ? parseInt(formData.budgetMin) : null,
          budgetMax: formData.budgetMax ? parseInt(formData.budgetMax) : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Bir hata oluştu');
        return;
      }

      setSuccess(true);
      setFormData({
        category: categoryPrefill || '',
        city: cityPrefill || '',
        description: '',
        budgetMin: '',
        budgetMax: '',
        budgetVisible: false,
        requesterName: '',
        requesterPhone: '',
        requesterEmail: '',
        preferredContactTime: 'flexible',
      });

      if (onSuccess) onSuccess();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('İş isteği gönderilirken bir hata oluştu');
      console.error('Lead submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[var(--border)] rounded-lg p-6 max-w-2xl mx-auto">
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <span className="text-green-600 text-2xl">✓</span>
          <div>
            <p className="font-semibold text-green-900">Başarıyla Gönderildi!</p>
            <p className="text-sm text-green-700">Uygun ustalar sizi bulacak.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <span className="text-red-600 text-2xl">✕</span>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[var(--secondary)] mb-1">
            Hizmet Türü *
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
            disabled={!!categoryPrefill}
          >
            <option value="">Seçin...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-[var(--secondary)] mb-1">
            Şehir *
          </label>
          <select
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
            disabled={!!cityPrefill}
          >
            <option value="">Seçin...</option>
            {TR_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--secondary)] mb-1">
          İş Tanımı
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Ne yaptırmak istiyorsunuz? Detayları yazınız..."
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none resize-none h-24"
        />
      </div>

      {/* Budget */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="budgetVisible"
              checked={formData.budgetVisible}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-[var(--secondary)]">Bütçe belirt (opsiyonel)</span>
          </label>
        </div>
        {formData.budgetVisible && (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="budgetMin"
              value={formData.budgetMin}
              onChange={handleChange}
              placeholder="Min ₺"
              className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              name="budgetMax"
              value={formData.budgetMax}
              onChange={handleChange}
              placeholder="Max ₺"
              className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Contact Time */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-[var(--secondary)] mb-2">
          İletişim Zamanı
        </label>
        <select
          name="preferredContactTime"
          value={formData.preferredContactTime}
          onChange={handleChange}
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
        >
          <option value="today">Bugün</option>
          <option value="this_week">Bu Hafta</option>
          <option value="flexible">Esneklik</option>
        </select>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-[var(--secondary)] mb-1">
            Adınız *
          </label>
          <input
            type="text"
            name="requesterName"
            value={formData.requesterName}
            onChange={handleChange}
            placeholder="Adı Soyadı"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--secondary)] mb-1">
            Telefon *
          </label>
          <input
            type="tel"
            name="requesterPhone"
            value={formData.requesterPhone}
            onChange={handleChange}
            placeholder="05XX XXX XX XX"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--secondary)] mb-1">
            Email *
          </label>
          <input
            type="email"
            name="requesterEmail"
            value={formData.requesterEmail}
            onChange={handleChange}
            placeholder="ornek@email.com"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--primary)] outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--primary)] hover:brightness-110 text-white px-6 py-3 rounded-lg font-semibold text-base disabled:opacity-70 transition"
      >
        {loading ? 'Gönderiliyor...' : 'İş İsteğini Gönder'}
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        Bilgileriniz güvende. Yalnızca eşleşen ustalar tarafından görülecektir.
      </p>
    </form>
  );
}
