"use client";

/**
 * Phase 267 — Escrow Settings (placeholder).
 *
 * Backend altyapısı hazır:
 *   GET   /admin/escrow/settings/all
 *   PATCH /admin/escrow/settings  { key, valueNumber? | valueBoolean? }
 *
 * Tunable keys:
 *   - escrow.gps_radius_m  (number, 10..50000)
 *   - escrow.gps_required  (boolean, default false)
 *   - escrow.grace_ms      (number, 60_000..24h)
 *   - escrow.deadline_ms   (number, 1h..30d)
 *
 * UI sonraki sprintte; bu sayfa rota sahibidir + admin'in altyapıyı görmesini sağlar.
 */
export default function EscrowSettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Escrow Ayarları</h1>
      <div className="p-4 bg-amber-50 border border-amber-200 rounded">
        <p className="text-amber-800 font-semibold">⚠ Yapılacaklar Listesinde</p>
        <p className="text-sm text-amber-700 mt-2">
          Backend altyapısı hazır (GET/PATCH <code>/admin/escrow/settings</code>).
          Ayarlanabilir: GPS yarıçapı, GPS zorunluluğu, grace süresi, deadline.
          UI implementasyonu sonraki sprintte.
        </p>
        <ul className="text-sm text-amber-700 mt-3 list-disc pl-5 space-y-1">
          <li><code>escrow.gps_radius_m</code> — slider 100m..5000m (default 1000m)</li>
          <li><code>escrow.gps_required</code> — toggle (default false: bypass)</li>
          <li><code>escrow.grace_ms</code> — select 5min/15min/30min/1h/2h (default 1h)</li>
          <li><code>escrow.deadline_ms</code> — select 24h/48h/72h (default 72h)</li>
        </ul>
      </div>
    </div>
  );
}
