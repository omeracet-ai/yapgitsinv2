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

    // Phase 537 — multipart uploads (photos/videos/documents) get an extended
    // send window: 30s is fine for JSON but chokes real-world video uploads on
    // 3G/4G. Callers may still override per-request.
    _dio.interceptors.add(_MultipartTimeoutInterceptor());
    // Phase 540k — transient errors (5xx / connection reset) tek retry;
    // 429 Retry-After respect edilir; başarısız olursa hata caller'a geçer.
    _dio.interceptors.add(_TransientRetryInterceptor(_dio));
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

/// Phase 537 — Bumps send/receive timeouts for multipart uploads. 30s
/// receiveTimeout on a slow uplink terminates video uploads mid-flight and
/// leaves the file half-written on the server. Only applied when the body is
/// FormData AND the caller has not overridden the timeouts explicitly.
class _MultipartTimeoutInterceptor extends Interceptor {
  static const _multipartSendTimeout = Duration(minutes: 5);
  static const _multipartReceiveTimeout = Duration(minutes: 5);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) {
    if (options.data is FormData) {
      options.sendTimeout ??= _multipartSendTimeout;
      options.receiveTimeout ??= _multipartReceiveTimeout;
    }
    handler.next(options);
  }
}

/// Phase 540k — Kısa süreli geçici hatalarda tek retry:
/// - 502/503/504 + connection/network hatası → 400ms sonra tek deneme
/// - 429 → Retry-After (saniye) header'ına uy, yoksa 1000ms bekle, tek deneme
/// FormData body üzerinde retry devre dışı (stream tükenmiş).
class _TransientRetryInterceptor extends Interceptor {
  _TransientRetryInterceptor(this._dio);
  final Dio _dio;

  static const _retryFlag = '_yg_transient_retried';

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final opts = err.requestOptions;
    if (opts.extra[_retryFlag] == true) {
      handler.next(err);
      return;
    }
    if (opts.data is FormData) {
      handler.next(err);
      return;
    }
    final status = err.response?.statusCode;
    final isTransient = err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        status == 502 ||
        status == 503 ||
        status == 504;
    final isRateLimited = status == 429;
    if (!isTransient && !isRateLimited) {
      handler.next(err);
      return;
    }
    int delayMs = 400;
    if (isRateLimited) {
      final ra = err.response?.headers.value('retry-after');
      final asSec = int.tryParse(ra ?? '');
      delayMs = asSec != null ? (asSec.clamp(1, 60) * 1000) : 1000;
    }
    await Future<void>.delayed(Duration(milliseconds: delayMs));
    try {
      opts.extra[_retryFlag] = true;
      final retried = await _dio.fetch<dynamic>(opts);
      handler.resolve(retried);
    } on DioException catch (e) {
      handler.next(e);
    }
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
    // Don't clobber a caller-supplied Authorization header, ancak boş string
    // veya null → yoksay ve token attach et (bazı callsite'lar `''` göndererek
    // yanlışlıkla auth'ı sıfırlıyordu).
    final existing = options.headers['Authorization'];
    final hasReal =
        existing is String && existing.trim().isNotEmpty;
    if (hasReal) {
      handler.next(options);
      return;
    }
    // Boş string ise header'ı da temizle (proxy'ler '' göndermeyi reject edebilir).
    options.headers.remove('Authorization');
    final token = await _readToken();
    if (token != null && token.isNotEmpty) {
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
  Completer<String?>? _refreshCompleter;

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
    // Phase 537 — FormData bodies stream their files ONCE; a naive retry after
    // token refresh would send the header pair but a zero-byte body → 400 or
    // silent truncation. Bail out early and let the caller re-upload.
    if (err.requestOptions.data is FormData) {
      if (kDebugMode) {
        debugPrint('[ApiClient] 401 on multipart upload — not retriable, '
            'caller must re-upload after re-auth');
      }
      handler.next(err);
      return;
    }
    // If another request is already refreshing, wait for it and retry with the
    // resulting access token — avoids concurrent 401s racing /auth/refresh.
    final inflight = _refreshCompleter;
    if (inflight != null) {
      final sharedAccess = await inflight.future;
      if (sharedAccess == null || sharedAccess.isEmpty) {
        handler.next(err);
        return;
      }
      try {
        final retryOptions = err.requestOptions
          ..headers['Authorization'] = 'Bearer $sharedAccess';
        final retried = await _dio.fetch<dynamic>(retryOptions);
        handler.resolve(retried);
      } on DioException catch (e) {
        handler.next(e);
      }
      return;
    }
    final completer = Completer<String?>();
    _refreshCompleter = completer;
    String? resolvedAccess;
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
        // Phase 537 — explicit no-Bearer: bare Dio has no interceptors so this
        // is belt-and-suspenders against a future refactor that sets a global
        // default Authorization header on the Dio instance.
        options: Options(headers: {'Authorization': null}),
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
      resolvedAccess = newAccess;
      // Retry original request once with the new access token.
      final retryOptions = err.requestOptions
        ..headers['Authorization'] = 'Bearer $newAccess';
      final retried = await _dio.fetch<dynamic>(retryOptions);
      handler.resolve(retried);
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[ApiClient] refresh failed: $e');
      // Only force-logout on an actual 401 from /auth/refresh (rejected token).
      // Transient network errors (timeout/offline) should NOT kill the session.
      if (e.response?.statusCode == 401) {
        await _forceLogout();
      }
      handler.next(err);
    } finally {
      _refreshCompleter = null;
      if (!completer.isCompleted) completer.complete(resolvedAccess);
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
