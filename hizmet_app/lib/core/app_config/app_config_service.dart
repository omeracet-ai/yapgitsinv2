import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/api_constants.dart';
import 'app_config_model.dart';

/// Public endpoint — no auth needed. SharedPrefs cache (60s TTL).
///
/// Hata durumunda fallback config döner; uygulama asla çökmez.
class AppConfigService {
  AppConfigService({Dio? dio}) : _dio = dio ?? Dio();

  final Dio _dio;

  static const String _cacheKey = 'app_config_cache_v1';
  static const String _cacheTsKey = 'app_config_cache_ts_v1';
  static const Duration _ttl = Duration(seconds: 60);

  AppConfig? _memory;

  AppConfig? get cached => _memory;

  Future<AppConfig> fetch({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      final cached = await _readCache();
      if (cached != null) {
        _memory = cached;
        return cached;
      }
    }

    try {
      final resp = await _dio
          .get<dynamic>(
            '${ApiConstants.baseUrl}/app-config',
            options: Options(
              receiveTimeout: const Duration(seconds: 6),
              sendTimeout: const Duration(seconds: 6),
            ),
          )
          .timeout(const Duration(seconds: 8));
      final data = resp.data;
      if (data is Map<String, dynamic>) {
        final cfg = AppConfig.fromJson(data);
        _memory = cfg;
        await _writeCache(data);
        return cfg;
      }
    } catch (_) {
      // Network/parse hatası → fallback
    }

    // Hata: önce stale cache (TTL bypass), sonra fallback.
    final stale = await _readCache(ignoreTtl: true);
    if (stale != null) {
      _memory = stale;
      return stale;
    }
    final fb = AppConfig.fallback();
    _memory = fb;
    return fb;
  }

  Future<AppConfig?> _readCache({bool ignoreTtl = false}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final ts = prefs.getInt(_cacheTsKey);
      final raw = prefs.getString(_cacheKey);
      if (ts == null || raw == null) return null;
      if (!ignoreTtl) {
        final age = DateTime.now().millisecondsSinceEpoch - ts;
        if (age > _ttl.inMilliseconds) return null;
      }
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return AppConfig.fromJson(decoded);
      }
    } catch (_) {}
    return null;
  }

  Future<void> _writeCache(Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cacheKey, jsonEncode(data));
      await prefs.setInt(
          _cacheTsKey, DateTime.now().millisecondsSinceEpoch);
    } catch (_) {}
  }
}
