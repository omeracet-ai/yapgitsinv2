import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

class WorkerInsurance {
  final String? id;
  final String policyNumber;
  final String provider;
  final double coverageAmount;
  final DateTime expiresAt;
  final bool verified;
  final String? documentUrl;

  WorkerInsurance({
    this.id,
    required this.policyNumber,
    required this.provider,
    required this.coverageAmount,
    required this.expiresAt,
    required this.verified,
    this.documentUrl,
  });

  factory WorkerInsurance.fromJson(Map<String, dynamic> j) => WorkerInsurance(
        id: j['id'] as String?,
        policyNumber: (j['policyNumber'] ?? '') as String,
        provider: (j['provider'] ?? '') as String,
        coverageAmount: ((j['coverageAmount'] as num?) ?? 0).toDouble(),
        expiresAt: DateTime.tryParse((j['expiresAt'] ?? '') as String) ??
            DateTime.now(),
        verified: (j['verified'] ?? false) as bool,
        documentUrl: j['documentUrl'] as String?,
      );
}

class PublicInsurance {
  final String provider;
  final double coverageAmount;
  final DateTime expiresAt;
  final bool verified;

  PublicInsurance({
    required this.provider,
    required this.coverageAmount,
    required this.expiresAt,
    required this.verified,
  });

  factory PublicInsurance.fromJson(Map<String, dynamic> j) => PublicInsurance(
        provider: (j['provider'] ?? '') as String,
        coverageAmount: ((j['coverageAmount'] as num?) ?? 0).toDouble(),
        expiresAt: DateTime.tryParse((j['expiresAt'] ?? '') as String) ??
            DateTime.now(),
        verified: (j['verified'] ?? false) as bool,
      );
}

final insuranceRepositoryProvider = Provider((ref) {
  return InsuranceRepository(dio: ref.read(apiClientProvider).dio);
});

class InsuranceRepository {
  final Dio _dio;

  InsuranceRepository({required Dio dio}) : _dio = dio;

  Future<WorkerInsurance?> getMine() async {
    try {
      final res = await _dio.get('/users/me/insurance');
      if (res.data == null) return null;
      return WorkerInsurance.fromJson(
          Map<String, dynamic>.from(res.data as Map));
    } catch (_) {
      return null;
    }
  }

  Future<WorkerInsurance> upsert({
    required String policyNumber,
    required String provider,
    required double coverageAmount,
    required DateTime expiresAt,
    String? documentUrl,
  }) async {
    final res = await _dio.post(
      '/users/me/insurance',
      data: {
        'policyNumber': policyNumber,
        'provider': provider,
        'coverageAmount': coverageAmount,
        'expiresAt': expiresAt.toIso8601String(),
        if (documentUrl != null) 'documentUrl': documentUrl,
      },
    );
    return WorkerInsurance.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<void> remove() async {
    await _dio.delete('/users/me/insurance');
  }

  Future<PublicInsurance?> getPublic(String userId) async {
    try {
      final res = await _dio.get('/users/$userId/insurance');
      if (res.data == null) return null;
      return PublicInsurance.fromJson(
          Map<String, dynamic>.from(res.data as Map));
    } catch (_) {
      return null;
    }
  }
}
