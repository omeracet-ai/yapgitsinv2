import 'package:flutter/foundation.dart' show kDebugMode, kIsWeb;
import 'dart:io' show Platform;

class ApiConstants {
  static const int backendPort = 3001;

  // Default: prod. Dev/ngrok için: --dart-define=API_URL=http://10.0.2.2:3001
  static const String _prodUrl = 'https://api.yapgitsin.tr';
  static const String _override =
      String.fromEnvironment('API_URL', defaultValue: '');

  /// Phase 537 — release build ALWAYS hits prod. Debug builds default to a
  /// sensible local loopback (10.0.2.2 for Android emulator, localhost for
  /// desktop/iOS/web) so a forgotten --dart-define stops silently sending
  /// dev traffic to prod. Explicit --dart-define=API_URL=... still wins.
  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (kDebugMode) {
      if (kIsWeb) return 'http://localhost:$backendPort';
      try {
        if (Platform.isAndroid) return 'http://10.0.2.2:$backendPort';
        if (Platform.isIOS) return 'http://localhost:$backendPort';
      } catch (_) {
        // Platform not available (e.g. non-mobile) → fall through.
      }
      return 'http://localhost:$backendPort';
    }
    return _prodUrl;
  }
}
