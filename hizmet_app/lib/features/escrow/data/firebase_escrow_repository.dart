import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';
import 'escrow_repository.dart';

export 'escrow_repository.dart' show Escrow, EscrowStatus;

final firebaseEscrowRepositoryProvider = Provider((ref) {
  return FirebaseEscrowRepository(fs: FirestoreService.instance);
});

/// Alias so screens that import this file can use [escrowRepositoryProvider].
final escrowRepositoryProvider = firebaseEscrowRepositoryProvider;

final firebaseEscrowByBookingProvider =
    FutureProvider.family<Escrow?, String>((ref, bookingId) async {
  return ref.watch(firebaseEscrowRepositoryProvider).getByBooking(bookingId);
});

class FirebaseEscrowRepository {
  final FirestoreService _fs;

  FirebaseEscrowRepository({required FirestoreService fs}) : _fs = fs;

  Escrow _fromMap(Map<String, dynamic> m) {
    DateTime? parseTs(dynamic v) {
      if (v == null) return null;
      if (v is Timestamp) return v.toDate();
      return DateTime.tryParse(v.toString());
    }

    return Escrow(
      id: m['id']?.toString() ?? '',
      bookingId: m['bookingId']?.toString() ?? '',
      customerId: m['customerId']?.toString() ?? '',
      workerId: m['workerId']?.toString() ?? '',
      amount: (m['amount'] as num?)?.toDouble() ?? 0,
      status: m['status']?.toString() ?? EscrowStatus.held,
      heldAt: parseTs(m['heldAt']),
      releasedAt: parseTs(m['releasedAt']),
      refundedAt: parseTs(m['refundedAt']),
      refundedAmount: (m['refundedAmount'] as num?)?.toDouble(),
    );
  }

  /// Escrow hold: payment_requests collection'a kayıt oluştur; Cloud Function işler.
  Future<Escrow> hold(String bookingId, double amount) async {
    final uid = _fs.uid;
    // Booking'den workerId al
    final booking = await _fs.getDoc('bookings/$bookingId');
    final workerId = booking?['workerId']?.toString() ?? '';

    // Escrow belgesi oluştur (pending durumda)
    final escrowId = await _fs.add('escrow', {
      'bookingId': bookingId,
      'customerId': uid ?? '',
      'workerId': workerId,
      'amount': amount,
      'status': EscrowStatus.held,
      'heldAt': _fs.serverNow,
    });

    // payment_requests: Cloud Function tarafından işlenecek
    await _fs.add('payment_requests', {
      'type': 'escrow_hold',
      'escrowId': escrowId,
      'bookingId': bookingId,
      'customerId': uid ?? '',
      'workerId': workerId,
      'amount': amount,
      'status': 'pending',
    });

    final snap = await _fs.getDoc('escrow/$escrowId');
    return _fromMap(snap!);
  }

  /// Escrow release: payment_requests'e kayıt ekle; Cloud Function işler.
  Future<Escrow> release(String bookingId) async {
    final q = _fs.col('escrow').where('bookingId', isEqualTo: bookingId).limit(1);
    final docs = await _fs.query(q);
    if (docs.isEmpty) throw StateError('Escrow not found for booking $bookingId');
    final escrow = docs.first;
    final escrowId = escrow['id'] as String;

    await _fs.add('payment_requests', {
      'type': 'escrow_release',
      'escrowId': escrowId,
      'bookingId': bookingId,
      'workerId': escrow['workerId'],
      'amount': escrow['amount'],
      'status': 'pending',
    });

    await _fs.update('escrow/$escrowId', {'status': 'release_pending'});

    final snap = await _fs.getDoc('escrow/$escrowId');
    return _fromMap(snap!);
  }

  Future<Escrow?> getByBooking(String bookingId) async {
    final q = _fs.col('escrow').where('bookingId', isEqualTo: bookingId).limit(1);
    final docs = await _fs.query(q);
    if (docs.isEmpty) return null;
    return _fromMap(docs.first);
  }

  /// Escrow oluştur (jobId üzerinden): payment_requests'e kayıt ekle; Cloud Function işler.
  Future<Map<String, dynamic>> createEscrow(String jobId, double amount) async {
    final uid = _fs.uid;
    final escrowId = await _fs.add('escrow', {
      'jobId': jobId,
      'customerId': uid ?? '',
      'amount': amount,
      'status': 'pending',
    });

    await _fs.add('payment_requests', {
      'type': 'escrow_create',
      'escrowId': escrowId,
      'jobId': jobId,
      'customerId': uid ?? '',
      'amount': amount,
      'status': 'pending',
    });

    return {'escrowId': escrowId, 'jobId': jobId, 'amount': amount, 'status': 'pending'};
  }

  /// Escrow ödeme serbest bırak: payment_requests'e kayıt ekle; Cloud Function işler.
  Future<void> releasePayment(String escrowId) async {
    final snap = await _fs.getDoc('escrow/$escrowId');
    await _fs.add('payment_requests', {
      'type': 'escrow_release',
      'escrowId': escrowId,
      'workerId': snap?['workerId'] ?? '',
      'amount': snap?['amount'] ?? 0,
      'status': 'pending',
    });
    await _fs.update('escrow/$escrowId', {'status': 'release_pending'});
  }

  Future<List<Map<String, dynamic>>> listMy() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    final q = _fs.col('escrow').where('customerId', isEqualTo: uid);
    return _fs.query(q);
  }
}
