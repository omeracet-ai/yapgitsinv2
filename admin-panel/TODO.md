# Admin Panel — Yapılacaklar

## Escrow Ayarları (Backend altyapı hazır 2026-05-27)
- [ ] `/escrow-settings` UI: 4 input + save button
  - GPS yarıçapı (slider 100m-5000m)
  - GPS zorunluluğu (toggle)
  - Grace süresi (5min/15min/30min/1hr/2hr select)
  - Deadline (24h/48h/72h select)
- [ ] Audit log entegrasyonu (kim değiştirdi)
- [ ] Real-time preview (mevcut bekleyen escrow sayısı)

Backend endpoint: `GET /admin/escrow/settings/all`, `PATCH /admin/escrow/settings`

Tunable keys:
- `escrow.gps_radius_m` (number, 10..50000)
- `escrow.gps_required` (boolean)
- `escrow.grace_ms` (number, 60_000..24h)
- `escrow.deadline_ms` (number, 1h..30d)
