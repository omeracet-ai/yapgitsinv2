import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final statementRepoProvider = Provider((ref) {
  final authRepo = ref.watch(authRepositoryProvider);
  return StatementRepository(authRepo);
});

final statementProvider = FutureProvider.family
    .autoDispose<Map<String, dynamic>, ({int year, int month})>((ref, period) {
  return ref
      .watch(statementRepoProvider)
      .getMonthly(period.year, period.month);
});

class StatementRepository {
  final AuthRepository _authRepository;
  final Dio _dio;

  StatementRepository(this._authRepository)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<Map<String, dynamic>> getMonthly(int year, int month) async {
    try {
      final token = await _authRepository.getToken();
      final mm = month.toString().padLeft(2, '0');
      final response = await _dio.get(
        '/statements/me',
        queryParameters: {'year': year, 'month': mm},
        options: Options(headers: {
          if (token != null) 'Authorization': 'Bearer $token',
        }),
      );
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      final code = e.response?.statusCode;
      if (code == 401) throw Exception('Oturum süresi doldu, tekrar giriş yapın.');
      final msg = e.response?.data?['message'];
      throw Exception(msg?.toString() ?? 'Beyan yüklenemedi');
    }
  }

  String getMonthlyCsvUrl(int year, int month) {
    final mm = month.toString().padLeft(2, '0');
    return '${ApiConstants.baseUrl}/statements/me/download?year=$year&month=$mm';
  }
}
