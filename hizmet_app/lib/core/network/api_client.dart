import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/api_constants.dart';
import '../services/secure_token_store.dart';

/// Central HTTP client for the app.
///
/// Phase 244: SP `jwt_token` legacy yolu kaldırıldı — SecureTokenStore tek kaynak.
///   - Access + refresh token sadece SecureTokenStore'dan okunur/yazılır.
///   - On 401: POST /auth/refresh once with the refresh token. On success,
///     persist the new pair to SecureTokenStore and retry the original
///     request once.
///   - On refresh failure (network/401/missing token): clear the store and
///     surface the original 401 — UI/router reacts on next protected call.
class ApiClient {
  /// [prefs] is accepted for legacy test compatibility but no longer used;
  /// all token I/O goes through [SecureTokenStore] as of Phase 244.
  ApiClient({Dio? dio, SharedPreferences? prefs, SecureTokenStore? tokenStore})
      : _dio = dio ?? Dio(),
        _tokenStore = tokenStore ?? SecureTokenStore() {
    // Accept the legacy [prefs] arg without using it.
    // ignore: unused_local_variable
    final legacyPrefs = prefs;
    _dio.options
      ..baseUrl = ApiConstants.baseUrl
      ..connectTimeout = const Duration(seconds: 20)
      ..receiveTimeout = const Duration(seconds: 30)
      ..sendTimeout = const Duration(seconds: 30)
      ..contentType = Headers.jsonContentType
      ..responseType = ResponseType.json;

    _dio.interceptors.add(_AuthInterceptor(_readAccessToken));
    _dio.interceptors.add(RefreshTokenInterceptor(
      dio: _dio,
      tokenStore: _tokenStore,
      writeAccessToken: _writeAccessToken,
    ));
  }

  static const String kAuthTokenKey = 'auth_token';
  static const String kRefreshTokenKey = 'refresh_token';

  final Dio _dio;
  final SecureTokenStore _tokenStore;

  Dio get dio => _dio;

  Future<String?> _readAccessToken() async {
    final secure = await _tokenStore.readToken();
    return (secure == null || secure.isEmpty) ? null : secure;
  }

  Future<void> _writeAccessToken(String token) async {
    await _tokenStore.writeToken(token);
  }
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._readToken);

  final Future<String?> Function() _readToken;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Don't clobber a caller-supplied Authorization header.
    if (options.headers.containsKey('Authorization')) {
      handler.next(options);
      return;
    }
    final token = await _readToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

/// On a 401, attempts a single refresh + retry against POST /auth/refresh.
/// Backend ships the endpoint as of Phase P188/4.
class RefreshTokenInterceptor extends Interceptor {
  RefreshTokenInterceptor({
    required Dio dio,
    required SecureTokenStore tokenStore,
    required Future<void> Function(String) writeAccessToken,
  })  : _dio = dio,
        _tokenStore = tokenStore,
        _writeAccessToken = writeAccessToken;

  // P188/4: backend now exposes POST /auth/refresh — interceptor active.
  static const bool _refreshEnabled = true;
  static const String _refreshPath = '/auth/refresh';

  final Dio _dio;
  final SecureTokenStore _tokenStore;
  final Future<void> Function(String) _writeAccessToken;
  bool _isRefreshing = false;

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401) {
      handler.next(err);
      return;
    }
    // Don't recurse on the refresh endpoint itself.
    if (err.requestOptions.path.endsWith(_refreshPath)) {
      await _forceLogout();
      handler.next(err);
      return;
    }
    if (!_refreshEnabled) {
      handler.next(err);
      return;
    }
    final refresh = await _tokenStore.readRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      if (kDebugMode) {
        debugPrint('[ApiClient] 401 + no refresh token → force logout');
      }
      await _forceLogout();
      handler.next(err);
      return;
    }
    if (_isRefreshing) {
      // Another request is already refreshing — surface the 401; caller may retry.
      handler.next(err);
      return;
    }
    _isRefreshing = true;
    try {
      // Bare Dio so we don't recurse through our own interceptor stack on refresh.
      final bare = Dio(BaseOptions(
        baseUrl: _dio.options.baseUrl,
        connectTimeout: _dio.options.connectTimeout,
        receiveTimeout: _dio.options.receiveTimeout,
        contentType: Headers.jsonContentType,
      ));
      final res = await bare.post<Map<String, dynamic>>(
        _refreshPath,
        data: {'refreshToken': refresh},
      );
      final newAccess = res.data?['accessToken'] as String?;
      final newRefresh = res.data?['refreshToken'] as String?;
      if (newAccess == null || newAccess.isEmpty) {
        await _forceLogout();
        handler.next(err);
        return;
      }
      await _writeAccessToken(newAccess);
      if (newRefresh != null && newRefresh.isNotEmpty) {
        await _tokenStore.writeRefreshToken(newRefresh);
      }
      // Retry original request once with the new access token.
      final retryOptions = err.requestOptions
        ..headers['Authorization'] = 'Bearer $newAccess';
      final retried = await _dio.fetch<dynamic>(retryOptions);
      handler.resolve(retried);
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[ApiClient] refresh failed: $e');
      // Refresh itself 401 (or any error) → force logout, bubble original 401.
      if (e.response?.statusCode == 401) {
        await _forceLogout();
      }
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }

  Future<void> _forceLogout() async {
    try {
      await _tokenStore.clear();
    } catch (_) {
      // Best-effort — never throw from interceptor cleanup.
    }
  }
}
