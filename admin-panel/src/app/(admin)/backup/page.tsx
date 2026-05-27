"use client";

/**
 * Phase 277 — /backup consolidated into /apk-icerik?tab=backup.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BackupRedirectPage() {
  const r = useRouter();
  useEffect(() => {
    r.replace("/apk-icerik?tab=backup");
  }, [r]);
  return (
    <div className="p-6 text-slate-400 text-sm">
      → APK Yönetim Merkezi&apos;ne yönlendiriliyor…
    </div>
  );
}
