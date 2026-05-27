"use client";

/**
 * Compact TR/EN locale switcher used in the admin topbar. Re-renders subscribed
 * consumers via the `onLocaleChange` hook in `@/i18n`.
 */

import { useEffect, useState } from "react";
import { getLocale, setLocale, onLocaleChange, type Locale } from "@/i18n";

export function LocaleSwitcher() {
  const [loc, setLoc] = useState<Locale>(getLocale());

  useEffect(() => {
    const off = onLocaleChange(setLoc);
    return () => {
      off();
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-1 text-xs">
      <span className="text-slate-400 mr-1" aria-hidden>🌐</span>
      {(["tr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={`px-2 py-0.5 rounded font-semibold uppercase tracking-wide transition ${
            loc === l
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-slate-800"
          }`}
          aria-pressed={loc === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
