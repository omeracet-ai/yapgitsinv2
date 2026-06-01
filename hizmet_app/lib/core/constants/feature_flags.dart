// Phase 354 — Feature flag registry.
// Tüm prototip / disabled-by-default özellikler buradan kontrol edilir.

/// Live location sharing (Hizmet Veren aktif emitter, Hizmet Alan pasif
/// dinleyici). Şu an LOCAL TEST için kapalı; UI bağlanmadan önce
/// `true` yap → debug ekran (`/debug/canli-konum`) görünür.
const bool kEnableLiveLocation = false;
