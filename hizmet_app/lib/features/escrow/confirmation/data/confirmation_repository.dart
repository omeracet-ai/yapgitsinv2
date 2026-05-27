import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/network/api_client_provider.dart';
import '../../../../core/utils/media_utils.dart';
import 'confirmation_state.dart';

/// Phase 254 — Escrow confirmation REST client.
///
/// Base path: /escrow/:id/confirmation/*
/// Endpoints (her biri JWT'li):
///   POST   /start    worker   → QR + tier + requirements
///   GET    /qr       customer → payer QR oluşturur (her iki taraf onayladıktan sonra, 5dk geçerli)
///   GET    /state    both     → polling için tam durum
///   POST   /scan     worker   → QR'ı tarat + GPS match → ödeme serbest bırakılır
///   POST   /photos   both     → multipart photo + phase + gps + takenAt
///   POST   /video    both     → multipart video + gps (premium)
///   POST   /approve  both     → onay (release tetiklemez; QR aşaması açılır)
///   POST   /confirm  both     → (legacy) onay
final confirmationRepositoryProvider = Provider((ref) {
  return ConfirmationRepository(dio: ref.read(apiClientProvider).dio);
});

class ConfirmationRepository {
  final Dio _dio;
  ConfirmationRepository({required Dio dio}) : _dio = dio;

  String _base(String escrowId) => '/escrow/$escrowId/confirmation';

  Future<QrToken> start({
    required String escrowId,
    required double lat,
    required double lng,
  }) async {
    try {
      final res = await _dio.post(
        '${_base(escrowId)}/start',
        data: {'lat': lat, 'lng': lng},
      );
      return QrToken.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Onay süreci başlatılamadı'));
    }
  }

  /// Customer (payer) QR oluşturur. Backend v2 GPS için opsiyonel lat/lng kabul eder.
  Future<QrToken> getQr(String escrowId, {double? lat, double? lng}) async {
    try {
      final res = await _dio.get(
        '${_base(escrowId)}/qr',
        queryParameters: (lat != null && lng != null)
            ? {'lat': lat, 'lng': lng}
            : null,
      );
      return QrToken.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      throw Exception(_msg(e, 'QR alınamadı'));
    }
  }

  Future<ConfirmationState> getState(String escrowId) async {
    try {
      final res = await _dio.get('${_base(escrowId)}/state');
      return ConfirmationState.fromJson(
          Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Durum alınamadı'));
    }
  }

  Future<ScanResult> scan({
    required String escrowId,
    required String qrToken,
    required double lat,
    required double lng,
  }) async {
    try {
      final res = await _dio.post(
        '${_base(escrowId)}/scan',
        data: {'qrToken': qrToken, 'lat': lat, 'lng': lng},
      );
      return ScanResult.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      throw Exception(_msg(e, 'QR doğrulanamadı'));
    }
  }

  Future<PhotoEntry> uploadPhoto({
    required String escrowId,
    required XFile file,
    required String phase, // before | after
    required double lat,
    required double lng,
    DateTime? takenAt,
  }) async {
    try {
      final bytes = await compressImage(file);
      final form = FormData.fromMap({
        'photo': MultipartFile.fromBytes(bytes, filename: file.name),
        'phase': phase,
        'lat': lat.toString(),
        'lng': lng.toString(),
        'takenAt': (takenAt ?? DateTime.now()).toUtc().toIso8601String(),
      });
      final res = await _dio.post('${_base(escrowId)}/photos', data: form);
      return PhotoEntry.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Fotoğraf yüklenemedi'));
    }
  }

  Future<Map<String, dynamic>> uploadVideo({
    required String escrowId,
    required XFile file,
    required double lat,
    required double lng,
  }) async {
    try {
      final bytes = await file.readAsBytes();
      final form = FormData.fromMap({
        'video': MultipartFile.fromBytes(bytes, filename: file.name),
        'lat': lat.toString(),
        'lng': lng.toString(),
      });
      final res = await _dio.post('${_base(escrowId)}/video', data: form);
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Video yüklenemedi'));
    }
  }

  /// v2 onay: kendi tarafının onayını set eder. Release tetiklemez —
  /// her iki taraf onayladıktan sonra QR aşaması açılır.
  Future<void> approve(String escrowId) async {
    try {
      await _dio.post('${_base(escrowId)}/approve', data: <String, dynamic>{});
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Onay gönderilemedi'));
    }
  }

  /// Phase 267 — plain confirm (no QR, no photo, no GPS gating). Returns
  /// `{ side, bothApproved, graceEndsAt, confirmationStatus }`. When both
  /// sides have confirmed, server transitions to PENDING_GRACE.
  Future<Map<String, dynamic>> confirmPlain({
    required String escrowId,
    required String side, // accepted but server resolves from JWT
  }) async {
    try {
      final res = await _dio.post(
        '${_base(escrowId)}/confirm-plain',
        data: <String, dynamic>{},
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Onay gönderilemedi'));
    }
  }

  /// Phase 267 — cancel during the 1hr grace window. Either party may invoke.
  Future<Map<String, dynamic>> cancelGrace({
    required String escrowId,
    String? reason,
  }) async {
    try {
      final res = await _dio.post(
        '${_base(escrowId)}/cancel-grace',
        data: reason == null ? <String, dynamic>{} : {'signature': reason},
      );
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw Exception(_msg(e, 'İptal başarısız'));
    }
  }

  Future<ConfirmResult> confirm({
    required String escrowId,
    String? signature,
  }) async {
    try {
      final res = await _dio.post(
        '${_base(escrowId)}/confirm',
        data: signature == null ? <String, dynamic>{} : {'signature': signature},
      );
      return ConfirmResult.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      throw Exception(_msg(e, 'Onay gönderilemedi'));
    }
  }

  String _msg(DioException e, String fallback) {
    final d = e.response?.data;
    if (d is Map && d['message'] != null) return d['message'].toString();
    return fallback;
  }
}
