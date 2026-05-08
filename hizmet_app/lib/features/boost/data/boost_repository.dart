import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final boostRepositoryProvider = Provider((ref) {
  return BoostRepository(ref.watch(authRepositoryProvider));
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
  final AuthRepository _auth;
  final Dio _dio;

  BoostRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<Options> _authOpts() async {
    final t = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $t'});
  }

  Future<List<Map<String, dynamic>>> getPackages() async {
    final res = await _dio.get('/boost/packages');
    return List<Map<String, dynamic>>.from(res.data as List);
  }

  Future<Map<String, List<Map<String, dynamic>>>> getMy() async {
    final res = await _dio.get('/boost/my', options: await _authOpts());
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
      options: await _authOpts(),
    );
    return Map<String, dynamic>.from(res.data as Map);
  }
}
