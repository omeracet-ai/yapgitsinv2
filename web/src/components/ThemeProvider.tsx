'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
type Resolved = 'light' | 'dark';

type Ctx = {
  theme: ThemeMode;
  actual: Resolved;
  setTheme: (t: ThemeMode) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

function resolve(t: ThemeMode): Resolved {
  if (t === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return t;
}

function apply(actual: Resolved) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', actual === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [actual, setActual] = useState<Resolved>('light');

  useEffect(() => {
    const stored = (typeof window !== 'undefined' &&
      (localStorage.getItem('theme') as ThemeMode | null)) || 'system';
    setThemeState(stored);
    const r = resolve(stored);
    setActual(r);
    apply(r);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const r: Resolved = mq.matches ? 'dark' : 'light';
      setActual(r);
      apply(r);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem('theme', t);
    } catch {}
    const r = resolve(t);
    setActual(r);
    apply(r);
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, actual, setTheme }}>{children}</ThemeCtx.Provider>
  );
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) return { theme: 'system' as ThemeMode, actual: 'light' as Resolved, setTheme: () => {} };
  return c;
}
