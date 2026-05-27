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
