'use client';

import { useTheme, type ThemeMode } from './ThemeProvider';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];
const ICON: Record<ThemeMode, string> = { system: '💻', light: '☀️', dark: '🌙' };

export default function ThemeToggle({ labels }: { labels: { system: string; light: string; dark: string } }) {
  const { theme, setTheme } = useTheme();
  const next = () => {
    const i = ORDER.indexOf(theme);
    setTheme(ORDER[(i + 1) % ORDER.length]);
  };
  return (
    <button
      type="button"
      onClick={next}
      aria-label={labels[theme]}
      title={labels[theme]}
      className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg text-base hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <span aria-hidden>{ICON[theme]}</span>
    </button>
  );
}
