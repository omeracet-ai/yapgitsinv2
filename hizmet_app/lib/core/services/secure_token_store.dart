import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Secure token storage — uses FlutterSecureStorage on mobile, SharedPreferences on web.
/// flutter_secure_storage_web is not auto-registered in the Flutter web plugin
/// registrant, so we fall back to SharedPreferences (localStorage) on web.
class SecureTokenStore {
  SecureTokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const String _kAuthToken = 'auth_token';
  static const String _kRefreshToken = 'refresh_token';
  static const String _kWebAuthToken = 'web_auth_token';
  static const String _kWebRefreshToken = 'web_refresh_token';

  final FlutterSecureStorage _storage;

  /// Phase 537 — in-memory access-token cache so socket handshake (which needs
  /// the token synchronously) can pick it up without an extra async round-trip.
  /// Populated by [readToken] / [writeToken] and cleared by [clear].
  static String? _cachedAccessToken;
  static String? cachedAccessToken() => _cachedAccessToken;

  Future<void> writeToken(String token) async {
    _cachedAccessToken = token;
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kWebAuthToken, token);
    } else {
      await _storage.write(key: _kAuthToken, value: token);
    }
  }

  Future<String?> readToken() async {
    if (_cachedAccessToken != null) return _cachedAccessToken;
    String? t;
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      t = prefs.getString(_kWebAuthToken);
    } else {
      t = await _storage.read(key: _kAuthToken);
    }
    _cachedAccessToken = t;
    return t;
  }

  Future<void> writeRefreshToken(String token) async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kWebRefreshToken, token);
    } else {
      await _storage.write(key: _kRefreshToken, value: token);
    }
  }

  Future<String?> readRefreshToken() async {
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_kWebRefreshToken);
    }
    return _storage.read(key: _kRefreshToken);
  }

  Future<void> clear() async {
    _cachedAccessToken = null;
    if (kIsWeb) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_kWebAuthToken);
      await prefs.remove(_kWebRefreshToken);
    } else {
      await _storage.delete(key: _kAuthToken);
      await _storage.delete(key: _kRefreshToken);
    }
  }
}
