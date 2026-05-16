import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_client_provider.dart';

/// Phase 133 — Public customer profile (no worker fields).
/// Phase 241 — Ham `Dio` kaldırıldı; merkezi [ApiClient] kullanılır
/// (AuthInterceptor + RefreshTokenInterceptor zincirini alır).
final customerProfileRepositoryProvider = Provider(
  (ref) => CustomerProfileRepository(ref.read(apiClientProvider)),
);

class CustomerProfileRepository {
  CustomerProfileRepository(this._api);

  final ApiClient _api;
  Dio get _dio => _api.dio;

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
