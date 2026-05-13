import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final boostRepositoryProvider = Provider((ref) {
  return BoostRepository(dio: ref.read(apiClientProvider).dio);
});

final boostPackagesProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return ref.watch(boostRepositoryProvider).getPackages();
});

final myBoostsProvider =
    FutureProvider<Map<String, List<Map<String, dynamic>>>>((ref) async {
  return ref.watch(boostRepositoryProvider).getMy();
});

class BoostRepository {
  final Dio _dio;

  BoostRepository({required Dio dio}) : _dio = dio;

  Future<List<Map<String, dynamic>>> getPackages() async {
    final res = await _dio.get('/boost/packages');
    return List<Map<String, dynamic>>.from(res.data as List);
  }

  Future<Map<String, List<Map<String, dynamic>>>> getMy() async {
    final res = await _dio.get('/boost/my');
    final data = Map<String, dynamic>.from(res.data as Map);
    return {
      'active': List<Map<String, dynamic>>.from(data['active'] as List? ?? []),
      'history': List<Map<String, dynamic>>.from(data['history'] as List? ?? []),
    };
  }

  Future<Map<String, dynamic>> purchase(String type) async {
    final res = await _dio.post(
      '/boost/purchase',
      data: {'type': type},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }
}
