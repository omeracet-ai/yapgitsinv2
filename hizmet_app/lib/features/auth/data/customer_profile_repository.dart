import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';

/// Phase 133 — Public customer profile (no worker fields).
final customerProfileRepositoryProvider =
    Provider((ref) => CustomerProfileRepository());

class CustomerProfileRepository {
  final Dio _dio;
  CustomerProfileRepository()
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 10),
        ));

  Future<Map<String, dynamic>> fetch(String userId) async {
    final resp = await _dio.get('/users/$userId/customer-profile');
    return Map<String, dynamic>.from(resp.data as Map);
  }
}

final customerProfileProvider =
    FutureProvider.autoDispose.family<Map<String, dynamic>, String>(
  (ref, userId) async {
    return ref.read(customerProfileRepositoryProvider).fetch(userId);
  },
);
