import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _baseUrl = 'http://localhost:3001';

final categoriesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 8)));
  try {
    final res = await dio.get('$_baseUrl/categories');
    final list = (res.data as List).cast<Map<String, dynamic>>();
    return list.where((c) => c['isActive'] == true).toList()
      ..sort((a, b) => ((a['sortOrder'] as num?) ?? 0).compareTo((b['sortOrder'] as num?) ?? 0));
  } catch (_) {
    return [];
  } finally {
    dio.close();
  }
});
