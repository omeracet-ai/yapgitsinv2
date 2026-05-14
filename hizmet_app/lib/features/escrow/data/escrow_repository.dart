import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

/// Phase 136 — Booking escrow client.
class EscrowStatus {
  static const held = 'held';
  static const released = 'released';
  static const refunded = 'refunded';
  static const cancelled = 'cancelled';
}

class Escrow {
  final String id;
  final String bookingId;
  final String customerId;
  final String workerId;
  final double amount;
  final String status;
  final DateTime? heldAt;
  final DateTime? releasedAt;
  final DateTime? refundedAt;
  final double? refundedAmount;

  Escrow({
    required this.id,
    required this.bookingId,
    required this.customerId,
    required this.workerId,
    required this.amount,
    required this.status,
    this.heldAt,
    this.releasedAt,
    this.refundedAt,
    this.refundedAmount,
  });

  factory Escrow.fromJson(Map<String, dynamic> j) {
    DateTime? p(dynamic v) => v == null ? null : DateTime.tryParse(v.toString());
    return Escrow(
      id: j['id']?.toString() ?? '',
      bookingId: j['bookingId']?.toString() ?? '',
      customerId: j['customerId']?.toString() ?? '',
      workerId: j['workerId']?.toString() ?? '',
      amount: (j['amount'] as num?)?.toDouble() ?? 0,
      status: j['status']?.toString() ?? EscrowStatus.held,
      heldAt: p(j['heldAt']),
      releasedAt: p(j['releasedAt']),
      refundedAt: p(j['refundedAt']),
      refundedAmount: (j['refundedAmount'] as num?)?.toDouble(),
    );
  }
}

final escrowRepositoryProvider = Provider((ref) {
  return EscrowRepository(dio: ref.read(apiClientProvider).dio);
});

final escrowByBookingProvider =
    FutureProvider.family<Escrow?, String>((ref, bookingId) async {
  return ref.watch(escrowRepositoryProvider).getByBooking(bookingId);
});

class EscrowRepository {
  final Dio _dio;

  EscrowRepository({required Dio dio}) : _dio = dio;

  Future<Escrow> hold(String bookingId, double amount) async {
    final res = await _dio.post('/escrow/hold',
        data: {'bookingId': bookingId, 'amount': amount});
    return Escrow.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<Escrow> release(String bookingId) async {
    final res = await _dio.post('/escrow/release/$bookingId');
    return Escrow.fromJson(Map<String, dynamic>.from(res.data as Map));
  }

  Future<Escrow?> getByBooking(String bookingId) async {
    try {
      final res = await _dio.get('/escrow/booking/$bookingId');
      return Escrow.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      return null;
    }
  }

  Future<Map<String, dynamic>> createEscrow(String jobId, double amount) async {
    final res = await _dio.post(
      '/escrow/create',
      data: {'jobId': jobId, 'amount': amount},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> releasePayment(String escrowId) async {
    await _dio.post('/escrow/$escrowId/release');
  }

  Future<List<Map<String, dynamic>>> listMy() async {
    final res = await _dio.get('/escrow/my');
    final list = res.data as List;
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }
}
