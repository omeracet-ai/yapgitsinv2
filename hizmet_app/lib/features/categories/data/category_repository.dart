import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';

// Phase 540M — timeout'lar diğer public endpoint'lerle hizalandı
// (connect 20s / receive 20s). Public endpoint, auth interceptor'sız raw Dio.
final categoriesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 20),
  ));
  try {
    final res = await dio.get('${ApiConstants.baseUrl}/categories');
    final raw = res.data;
    if (raw is! List) return const [];
    final list = raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    return list.where((c) => c['isActive'] == true).toList()
      ..sort((a, b) => ((a['sortOrder'] as num?) ?? 0).compareTo((b['sortOrder'] as num?) ?? 0));
  } catch (_) {
    return [];
  } finally {
    dio.close();
  }
});
