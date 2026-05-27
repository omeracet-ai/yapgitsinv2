import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_config_model.dart';
import 'app_config_service.dart';

/// Singleton service.
final appConfigServiceProvider =
    Provider<AppConfigService>((ref) => AppConfigService());

/// Async fetch — UI tarafında watch edilince network çağrısı yapar.
final appConfigProvider = FutureProvider<AppConfig>((ref) async {
  final svc = ref.watch(appConfigServiceProvider);
  return svc.fetch();
});

/// Senkron erişim — cached değer varsa onu, yoksa fallback'i döner.
/// UI'da blocking olmayan tema/branding okumaları için kullanılır.
final appConfigSyncProvider = Provider<AppConfig>((ref) {
  final svc = ref.watch(appConfigServiceProvider);
  return svc.cached ?? AppConfig.fallback();
});
