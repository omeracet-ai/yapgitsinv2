import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/api_constants.dart';

/// Central HTTP client for the app.
///
/// Phase P187/5 (Voldi-sec): foundation only. The existing 231 Dio call sites
/// are NOT migrated here — that lands in a later phase. This class wires up:
///   1. A single `Dio` instance pointed at [ApiConstants.baseUrl].
///   2. An auth interceptor that injects `Authorization: Bearer <token>` from
///      the shared token store (key `auth_token`, same key used by
///      `SecureTokenStore` — Voldi-sec-2 migrates the persistence layer to
///      flutter_secure_storage in parallel; the key contract stays stable).
///   3. A stub [RefreshTokenInterceptor] that handles 401s. The backend
///      auth controller (`nestjs-backend/src/modules/auth/auth.controller.ts`)
///      does NOT currently expose a `/auth/refresh` route, so on 401 we just
///      log and bubble the error up. When the backend ships refresh, flip
///      [_refreshEnabled] and the retry path activates.
class ApiClient {
  ApiClient({Dio? dio, SharedPreferences? prefs})
      : _dio = dio ?? Dio(),
        _prefsOverride = prefs {
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
      readRefreshToken: _readRefreshToken,
    ));
  }

  static const String kAuthTokenKey = 'auth_token';
  static const String kRefreshTokenKey = 'refresh_token';

  final Dio _dio;
  final SharedPreferences? _prefsOverride;

  Dio get dio => _dio;

  Future<SharedPreferences> _prefs() async =>
      _prefsOverride ?? await SharedPreferences.getInstance();

  Future<String?> _readAccessToken() async {
    final p = await _prefs();
    final t = p.getString(kAuthTokenKey);
    return (t == null || t.isEmpty) ? null : t;
  }

  Future<String?> _readRefreshToken() async {
    final p = await _prefs();
    final t = p.getString(kRefreshTokenKey);
    return (t == null || t.isEmpty) ? null : t;
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

/// On a 401, attempts a single refresh + retry. Currently a stub: the backend
/// does not expose a refresh route, so we log and surface the original 401.
/// When the route lands, set [_refreshEnabled] = true and the retry path runs.
class RefreshTokenInterceptor extends Interceptor {
  RefreshTokenInterceptor({
    required Dio dio,
    required Future<String?> Function() readRefreshToken,
  })  : _dio = dio,
        _readRefreshToken = readRefreshToken;

  // Flip to true once nestjs-backend ships POST /auth/refresh.
  static const bool _refreshEnabled = false;

  // Canonical route — checked against auth.controller.ts on 2026-05-13:
  // controller has login / register / 2fa / forgot-password / etc., but no
  // refresh endpoint. Update if backend uses a different path.
  static const String _refreshPath = '/auth/refresh';

  final Dio _dio;
  final Future<String?> Function() _readRefreshToken;
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
    final refresh = await _readRefreshToken();
    if (!_refreshEnabled || refresh == null) {
      if (kDebugMode) {
        debugPrint(
          '[ApiClient] 401 on ${err.requestOptions.uri} '
          '(refresh ${_refreshEnabled ? "no token" : "disabled"})',
        );
      }
      handler.next(err);
      return;
    }
    if (_isRefreshing) {
      handler.next(err);
      return;
    }
    _isRefreshing = true;
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        _refreshPath,
        data: {'refreshToken': refresh},
      );
      final newToken = res.data?['accessToken'] as String?;
      if (newToken == null || newToken.isEmpty) {
        handler.next(err);
        return;
      }
      final retryOptions = err.requestOptions
        ..headers['Authorization'] = 'Bearer $newToken';
      final retried = await _dio.fetch<dynamic>(retryOptions);
      handler.resolve(retried);
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[ApiClient] refresh failed: $e');
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }
}
