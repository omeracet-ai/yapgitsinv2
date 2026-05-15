import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/booking_model.dart';
import '../../../core/services/firestore_service.dart';

final firebaseBookingRepositoryProvider = Provider((ref) {
  return FirebaseBookingRepository(fs: FirestoreService.instance);
});

final firebaseMyWorkerBookingsProvider = FutureProvider<List<Booking>>((ref) async {
  return ref.watch(firebaseBookingRepositoryProvider).getMyBookingsAsWorker();
});

final firebaseMyCustomerBookingsProvider = FutureProvider<List<Booking>>((ref) async {
  return ref.watch(firebaseBookingRepositoryProvider).getMyBookingsAsCustomer();
});

/// Aliases so screens that import this file can use the original provider names.
final bookingRepositoryProvider = firebaseBookingRepositoryProvider;
final myWorkerBookingsProvider = firebaseMyWorkerBookingsProvider;
final myCustomerBookingsProvider = firebaseMyCustomerBookingsProvider;

class FirebaseBookingRepository {
  final FirestoreService _fs;

  FirebaseBookingRepository({required FirestoreService fs}) : _fs = fs;

  Booking _fromMap(Map<String, dynamic> m) {
    DateTime? parseTs(dynamic v) {
      if (v == null) return null;
      if (v is Timestamp) return v.toDate();
      return DateTime.tryParse(v.toString());
    }

    return Booking(
      id: m['id']?.toString() ?? '',
      customerId: m['customerId']?.toString() ?? '',
      workerId: m['workerId']?.toString() ?? '',
      category: m['category']?.toString() ?? '',
      subCategory: m['subCategory']?.toString(),
      description: m['description']?.toString() ?? '',
      address: m['address']?.toString() ?? '',
      scheduledDate: parseTs(m['scheduledDate']) ?? DateTime.now(),
      scheduledTime: m['scheduledTime']?.toString(),
      status: BookingStatus.values.firstWhere(
        (e) => e.name == m['status'],
        orElse: () => BookingStatus.pending,
      ),
      agreedPrice: (m['agreedPrice'] as num?)?.toDouble(),
    );
  }

  Future<List<Booking>> getMyBookingsAsWorker() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    final q = _fs.col('bookings').where('workerId', isEqualTo: uid);
    final docs = await _fs.query(q);
    return docs.map(_fromMap).toList();
  }

  Future<List<Booking>> getMyBookingsAsCustomer() async {
    final uid = _fs.uid;
    if (uid == null) return [];
    final q = _fs.col('bookings').where('customerId', isEqualTo: uid);
    final docs = await _fs.query(q);
    return docs.map(_fromMap).toList();
  }

  Future<Booking> createBooking({
    required String workerId,
    required String category,
    String? subCategory,
    required String description,
    required String address,
    required String scheduledDate,
    String? scheduledTime,
    double? agreedPrice,
    String? customerNote,
  }) async {
    final uid = _fs.uid;
    final data = <String, dynamic>{
      'customerId': uid ?? '',
      'workerId': workerId,
      'category': category,
      'description': description,
      'address': address,
      'scheduledDate': scheduledDate,
      'status': BookingStatus.pending.name,
      if (subCategory != null && subCategory.isNotEmpty) 'subCategory': subCategory,
      if (scheduledTime != null && scheduledTime.isNotEmpty) 'scheduledTime': scheduledTime,
      if (agreedPrice != null) 'agreedPrice': agreedPrice,
      if (customerNote != null && customerNote.isNotEmpty) 'customerNote': customerNote,
    };
    final id = await _fs.add('bookings', data);
    final snap = await _fs.getDoc('bookings/$id');
    return _fromMap(snap!);
  }

  Future<Map<String, dynamic>> cancelBooking(String bookingId, String reason) async {
    await _fs.update('bookings/$bookingId', {
      'status': BookingStatus.cancelled.name,
      'cancelReason': reason,
      'cancelledAt': _fs.serverNow,
    });
    return {'bookingId': bookingId, 'status': BookingStatus.cancelled.name, 'reason': reason};
  }

  Future<List<Map<String, dynamic>>> getAvailabilitySlots(String workerId, {int days = 30}) async {
    final until = DateTime.now().add(Duration(days: days)).toIso8601String();
    final q = _fs
        .col('availability_slots')
        .where('workerId', isEqualTo: workerId)
        .where('date', isLessThanOrEqualTo: until)
        .orderBy('date');
    return _fs.query(q);
  }
}
