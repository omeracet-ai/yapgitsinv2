import 'app_config_model.dart';

/// Basit visibility kuralları — şu an sadece `active` flag check.
/// Role/device ileri sprintte eklenecek.
///
/// Beklenen entry şekli:
/// ```json
/// { "key": "module.tokens", "active": false }
/// ```
bool isModuleVisible(String moduleKey, AppConfig config) {
  for (final entry in config.visibility) {
    final key = entry['key'];
    if (key is String && key == moduleKey) {
      final active = entry['active'];
      if (active is bool) return active;
      return true;
    }
  }
  // Kural yoksa varsayılan: görünür.
  return true;
}

/// Profile card field visibility — admin paneldeki `/profile-card` ekranı
/// `app_layouts` entity'sine `screen='profile_card'` satırı yazar. Her item
/// `{ key, visible, props: { label? } }` şeklindedir.
///
/// Kural yoksa varsayılan: görünür (true). Bu sayede admin paneline hiç
/// dokunulmamış kurulumlar mevcut davranışı korur.
bool isProfileFieldVisible(String fieldKey, AppConfig config) {
  for (final layout in config.layouts) {
    final screen = layout['screen'];
    if (screen != 'profile_card') continue;
    final items = layout['items'];
    if (items is! List) continue;
    for (final raw in items) {
      if (raw is! Map) continue;
      final key = raw['key'] ?? raw['componentKey'];
      if (key != fieldKey) continue;
      final visible = raw['visible'];
      if (visible is bool) return visible;
      return true;
    }
    // Layout var ama bu key listede değil → admin alan eklemediği için
    // varsayılan: görünür.
    return true;
  }
  // Hiç layout yoksa: görünür.
  return true;
}

/// Phase 276 — All-Pages Registry visibility gate.
///
/// Admin panelden bir ekran "pasif" edildiyse Flutter router redirect ile
/// engeller. Liste boşsa (backend yok / eski API) safe default → tüm sayfalar
/// görünür kabul edilir.
bool isScreenVisible(String key, AppConfig config) {
  final screens = config.screens;
  if (screens.isEmpty) return true;
  for (final entry in screens) {
    if (entry['key'] == key) {
      final v = entry['visible'];
      if (v is bool) return v;
      return true;
    }
  }
  // Key listede yoksa: registry'de kayıt yok → default görünür.
  return true;
}

/// Profile card için admin tarafından override edilmiş label döner, yoksa null.
/// Flutter ekran kendi varsayılan Türkçe etiketine fallback eder.
String? profileFieldLabel(String fieldKey, AppConfig config) {
  for (final layout in config.layouts) {
    if (layout['screen'] != 'profile_card') continue;
    final items = layout['items'];
    if (items is! List) continue;
    for (final raw in items) {
      if (raw is! Map) continue;
      final key = raw['key'] ?? raw['componentKey'];
      if (key != fieldKey) continue;
      final props = raw['props'];
      if (props is Map) {
        final label = props['label'];
        if (label is String && label.trim().isNotEmpty) return label.trim();
      }
      return null;
    }
  }
  return null;
}
