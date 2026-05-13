import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure token storage for auth credentials.
///
/// Backed by `flutter_secure_storage` (Keychain on iOS, EncryptedSharedPreferences
/// on Android). Keys are coordinated with Voldi-sec-1 (ApiClient interceptor):
///   - `auth_token`    → access token
///   - `refresh_token` → refresh token
///
/// During the migration window (Phase 187/5) tokens may also exist in the
/// legacy `SharedPreferences` store under the key `jwt_token` — see the
/// one-shot migration shim in `auth_repository.dart`.
class SecureTokenStore {
  // NOTE: flutter_secure_storage 10.x deprecates
  // `AndroidOptions(encryptedSharedPreferences: true)` — encryption is now the
  // default and Jetpack Security's EncryptedSharedPreferences is being phased
  // out for custom ciphers (auto-migrated on first access). Keeping the
  // explicit option would emit a `deprecated_member_use` info from analyzer.
  SecureTokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const String _kAuthToken = 'auth_token';
  static const String _kRefreshToken = 'refresh_token';

  final FlutterSecureStorage _storage;

  Future<void> writeToken(String token) =>
      _storage.write(key: _kAuthToken, value: token);

  Future<String?> readToken() => _storage.read(key: _kAuthToken);

  Future<void> writeRefreshToken(String token) =>
      _storage.write(key: _kRefreshToken, value: token);

  Future<String?> readRefreshToken() => _storage.read(key: _kRefreshToken);

  Future<void> clear() async {
    await _storage.delete(key: _kAuthToken);
    await _storage.delete(key: _kRefreshToken);
  }
}
