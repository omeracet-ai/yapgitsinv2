'use client';

import { useState, type FormEvent } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Source = 'landing' | 'category' | 'worker_profile' | 'job_detail';

type Props = {
  source: Source;
  category?: string;
  targetWorkerId?: string;
  title?: string;
  subtitle?: string;
  className?: string;
};

type State = 'idle' | 'submitting' | 'success' | 'error';

const PHONE_RE = /^(\+90|0)?5\d{9}$/;

export default function LeadForm({
  source,
  category,
  targetWorkerId,
  title = 'Hızlı İletişim',
  subtitle = 'Adınızı ve telefonunuzu bırakın, en kısa sürede dönüş yapalım.',
  className = '',
}: Props) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError('Lütfen adınızı giriniz.');
      return;
    }
    const phoneClean = phoneNumber.replace(/\s+/g, '');
    if (!PHONE_RE.test(phoneClean)) {
      setError('Geçerli bir telefon numarası giriniz (örn: 5XX XXX XX XX).');
      return;
    }
    if (message.trim().length < 10) {
      setError('Mesajınız en az 10 karakter olmalıdır.');
      return;
    }

    setState('submitting');
    try {
      const res = await fetch(`${API}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: phoneClean,
          email: email.trim() || undefined,
          message: message.trim(),
          category: category || undefined,
          targetWorkerId: targetWorkerId || undefined,
          source,
          website: website || undefined,
        }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Çok sık deneme yaptınız. Lütfen biraz sonra tekrar deneyin.');
        }
        throw new Error('Talebiniz gönderilemedi. Lütfen tekrar deneyin.');
      }
      setState('success');
      setName('');
      setPhoneNumber('');
      setEmail('');
      setMessage('');
      setWebsite('');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    }
  }

  if (state === 'success') {
    return (
      <div
        className={`bg-white border border-[var(--border)] rounded-2xl p-6 md:p-8 text-center ${className}`}
      >
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-xl font-bold text-[var(--secondary)] mb-2">Talebiniz alındı</h3>
        <p className="text-gray-600 mb-4">
          En kısa sürede sizinle iletişime geçeceğiz. Teşekkür ederiz.
        </p>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="text-[var(--primary)] font-medium hover:underline min-h-[40px]"
        >
          Yeni bir talep gönder
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white border border-[var(--border)] rounded-2xl p-5 md:p-7 shadow-sm ${className}`}
      noValidate
    >
      <h3 className="text-lg md:text-xl font-bold text-[var(--secondary)] mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{subtitle}</p>

      {/* Honeypot — hidden from real users */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="lf-website">Website</label>
        <input
          id="lf-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3">
        <label className="block">
          <span className="block text-sm font-medium text-[var(--secondary)] mb-1">Ad Soyad *</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adınız Soyadınız"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 min-h-[44px] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            maxLength={100}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-[var(--secondary)] mb-1">Telefon *</span>
          <input
            type="tel"
            required
            inputMode="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="5XX XXX XX XX"
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 min-h-[44px] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            maxLength={20}
          />
        </label>
      </div>

      <label className="block mb-3">
        <span className="block text-sm font-medium text-[var(--secondary)] mb-1">E-posta (opsiyonel)</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@email.com"
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 min-h-[44px] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          maxLength={255}
        />
      </label>

      <label className="block mb-4">
        <span className="block text-sm font-medium text-[var(--secondary)] mb-1">Mesajınız *</span>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hangi hizmete ihtiyacınız var? Kısaca açıklayın."
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] resize-none"
          minLength={10}
          maxLength={2000}
        />
        <span className="text-xs text-gray-500 mt-1 block">{message.length}/2000</span>
      </label>

      {error && (
        <div className="mb-3 text-sm text-[var(--error)] bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] transition"
      >
        {state === 'submitting' ? 'Gönderiliyor…' : 'Talep Gönder'}
      </button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Talebiniz Yapgitsin ekibine iletilir. Bilgileriniz üçüncü taraflarla paylaşılmaz.
      </p>
    </form>
  );
}
