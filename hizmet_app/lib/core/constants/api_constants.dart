import 'package:flutter/foundation.dart';

class ApiConstants {
  static const int backendPort = 3001;

  // flutter run --dart-define=API_URL=https://xxxx.ngrok-free.app
  static const String _override =
      String.fromEnvironment('API_URL', defaultValue: 'https://api.yapgitsin.tr');

  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    if (kIsWeb) return 'http://localhost:$backendPort';
    // Use defaultTargetPlatform so this file works on web without importing dart:io.
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:$backendPort';
    }
    return 'http://localhost:$backendPort';
  }
}
