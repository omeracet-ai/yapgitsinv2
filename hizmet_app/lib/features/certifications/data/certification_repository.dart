import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

class WorkerCertification {
  final String id;
  final String name;
  final String issuer;
  final DateTime issuedAt;
  final DateTime? expiresAt;
  final String? documentUrl;
  final bool verified;

  WorkerCertification({
    required this.id,
    required this.name,
    required this.issuer,
    required this.issuedAt,
    this.expiresAt,
    this.documentUrl,
    required this.verified,
  });

  factory WorkerCertification.fromJson(Map<String, dynamic> j) =>
      WorkerCertification(
        id: (j['id'] ?? '') as String,
        name: (j['name'] ?? '') as String,
        issuer: (j['issuer'] ?? '') as String,
        issuedAt: DateTime.tryParse((j['issuedAt'] ?? '') as String) ??
            DateTime.now(),
        expiresAt: j['expiresAt'] != null
            ? DateTime.tryParse(j['expiresAt'] as String)
            : null,
        documentUrl: j['documentUrl'] as String?,
        verified: (j['verified'] ?? false) as bool,
      );
}

class PublicCertification {
  final String name;
  final String issuer;
  final DateTime issuedAt;
  final DateTime? expiresAt;
  final bool verified;

  PublicCertification({
    required this.name,
    required this.issuer,
    required this.issuedAt,
    this.expiresAt,
    required this.verified,
  });

  factory PublicCertification.fromJson(Map<String, dynamic> j) =>
      PublicCertification(
        name: (j['name'] ?? '') as String,
        issuer: (j['issuer'] ?? '') as String,
        issuedAt: DateTime.tryParse((j['issuedAt'] ?? '') as String) ??
            DateTime.now(),
        expiresAt: j['expiresAt'] != null
            ? DateTime.tryParse(j['expiresAt'] as String)
            : null,
        verified: (j['verified'] ?? false) as bool,
      );
}

final certificationRepositoryProvider = Provider((ref) {
  return CertificationRepository(ref.watch(authRepositoryProvider));
});

class CertificationRepository {
  final AuthRepository _auth;
  final Dio _dio;

  CertificationRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<Options> _opts() async {
    final t = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $t'});
  }

  Future<List<WorkerCertification>> listMine() async {
    try {
      final res =
          await _dio.get('/users/me/certifications', options: await _opts());
      final list = (res.data as List?) ?? const [];
      return list
          .map((e) =>
              WorkerCertification.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  Future<WorkerCertification> create({
    required String name,
    required String issuer,
    required DateTime issuedAt,
    DateTime? expiresAt,
    String? documentUrl,
  }) async {
    final res = await _dio.post(
      '/users/me/certifications',
      data: {
        'name': name,
        'issuer': issuer,
        'issuedAt': issuedAt.toIso8601String(),
        if (expiresAt != null) 'expiresAt': expiresAt.toIso8601String(),
        if (documentUrl != null) 'documentUrl': documentUrl,
      },
      options: await _opts(),
    );
    return WorkerCertification.fromJson(
        Map<String, dynamic>.from(res.data as Map));
  }

  Future<void> remove(String id) async {
    await _dio.delete('/users/me/certifications/$id', options: await _opts());
  }

  Future<List<PublicCertification>> getPublic(String userId) async {
    try {
      final res = await _dio.get('/users/$userId/certifications');
      final list = (res.data as List?) ?? const [];
      return list
          .map((e) =>
              PublicCertification.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Upload doc (pdf/jpg/png), returns URL.
  Future<String> uploadDocument(String filePath) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath),
    });
    final res = await _dio.post(
      '/uploads/certification',
      data: form,
      options: await _opts(),
    );
    return ((res.data as Map)['url'] ?? '') as String;
  }
}
