"use client";

/**
 * Phase 277 — /apk-tasarim consolidated into /apk-icerik?tab=theme.
 * This route is kept as a redirect for backward compatibility.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApkTasarimRedirectPage() {
  const r = useRouter();
  useEffect(() => {
    r.replace("/apk-icerik?tab=theme");
  }, [r]);
  return (
    <div className="p-6 text-slate-400 text-sm">
      → APK Yönetim Merkezi&apos;ne yönlendiriliyor…
    </div>
  );
}
