"use client";

/**
 * Phase 277 — /profile-card consolidated into /apk-icerik?tab=profile-card.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileCardRedirectPage() {
  const r = useRouter();
  useEffect(() => {
    r.replace("/apk-icerik?tab=profile-card");
  }, [r]);
  return (
    <div className="p-6 text-slate-400 text-sm">
      → APK Yönetim Merkezi&apos;ne yönlendiriliyor…
    </div>
  );
}
