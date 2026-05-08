'use client';
// Phase 95 — PWA install prompt banner. Captures `beforeinstallprompt`,
// dismissible (LocalStorage 7-gün), i18n-aware via injected dictionary keys.
import { useEffect, useState } from 'react';

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'pwa_install_dismissed_at';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export default function PwaInstallBanner({
  title,
  installLabel,
  dismissLabel,
}: {
  title: string;
  installLabel: string;
  dismissLabel: string;
}) {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || '0');
      if (ts && Date.now() - ts < SEVEN_DAYS) return;
    } catch {}
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () =>
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  if (!show || !evt) return null;

  const onInstall = async () => {
    try {
      await evt.prompt();
      await evt.userChoice;
    } catch {}
    setShow(false);
    setEvt(null);
  };
  const onDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label={title}
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-2xl md:left-auto md:right-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#007DFE] text-lg font-extrabold text-white">
          Y
        </div>
        <p className="flex-1 text-sm font-medium text-gray-900">{title}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onInstall}
          className="flex-1 rounded-lg bg-[#007DFE] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0056B3]"
        >
          {installLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg border border-black/10 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
