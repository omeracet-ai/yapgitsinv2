/**
 * Minimal i18n helper — no external deps. Resolves keys against a static
 * JSON bundle and persists the chosen locale to localStorage so reloads keep
 * the user's preference.
 *
 * Usage:
 *   import { t, setLocale, getLocale } from "@/i18n";
 *   t("nav.dashboard")                  → "Dashboard"
 *   setLocale("en")                     → switches + persists
 *
 * Falls back to the key itself if no translation exists.
 */

import tr from "./tr.json";
import en from "./en.json";

export type Locale = "tr" | "en";

const BUNDLES: Record<Locale, Record<string, string>> = { tr, en };
const STORAGE_KEY = "admin_locale";
const DEFAULT_LOCALE: Locale = "tr";

let current: Locale = DEFAULT_LOCALE;

// Read persisted locale on module init (client-side only).
if (typeof window !== "undefined") {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "tr" || saved === "en") current = saved;
  } catch {
    /* localStorage unavailable — keep default */
  }
}

const listeners = new Set<(l: Locale) => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(l: Locale): void {
  if (l !== "tr" && l !== "en") return;
  current = l;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }
  for (const fn of listeners) fn(l);
}

/** Subscribe to locale changes. Returns an unsubscribe function. */
export function onLocaleChange(fn: (l: Locale) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate a key. Falls back to the key if missing. */
export function t(key: string): string {
  const bundle = BUNDLES[current] ?? BUNDLES[DEFAULT_LOCALE];
  return bundle[key] ?? BUNDLES[DEFAULT_LOCALE][key] ?? key;
}
