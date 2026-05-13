import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/models/booking_model.dart';
import '../../../core/network/api_client_provider.dart';

final bookingRepositoryProvider = Provider((ref) {
  return BookingRepository(dio: ref.read(apiClientProvider).dio);
});

final myWorkerBookingsProvider = FutureProvider<List<Booking>>((ref) async {
  return ref.watch(bookingRepositoryProvider).getMyBookingsAsWorker();
});

final myCustomerBookingsProvider = FutureProvider<List<Booking>>((ref) async {
  return ref.watch(bookingRepositoryProvider).getMyBookingsAsCustomer();
});

class BookingRepository {
  final Dio _dio;

  BookingRepository({required Dio dio}) : _dio = dio;

  Future<List<Booking>> getMyBookingsAsWorker() async {
    try {
      final res = await _dio.get('/bookings/my-as-worker');
      final List data = res.data is List ? res.data : (res.data['data'] ?? []);
      return data.map((e) => Booking.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<Booking> createBooking({
    required String workerId,
    required String category,
    String? subCategory,
    required String description,
    required String address,
    required String scheduledDate, // YYYY-MM-DD
    String? scheduledTime, // HH:MM
    double? agreedPrice,
    String? customerNote,
  }) async {
    final body = <String, dynamic>{
      'workerId': workerId,
      'category': category,
      'description': description,
      'address': address,
      'scheduledDate': scheduledDate,
    };
    if (subCategory != null && subCategory.isNotEmpty) body['subCategory'] = subCategory;
    if (scheduledTime != null && scheduledTime.isNotEmpty) body['scheduledTime'] = scheduledTime;
    if (agreedPrice != null) body['agreedPrice'] = agreedPrice;
    if (customerNote != null && customerNote.isNotEmpty) body['customerNote'] = customerNote;

    final res = await _dio.post('/bookings', data: body);
    return Booking.fromJson(res.data as Map<String, dynamic>);
  }

  /// Phase 128 — cancel a booking with reason; returns refund preview from server.
  Future<Map<String, dynamic>> cancelBooking(
      String bookingId, String reason) async {
    final res = await _dio.post(
      '/bookings/$bookingId/cancel',
      data: {'reason': reason},
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  /// Phase 135 — Public worker availability slots (next N days).
  Future<List<Map<String, dynamic>>> getAvailabilitySlots(
      String workerId, {int days = 30}) async {
    try {
      final res = await _dio.get(
        '/users/$workerId/availability-slots',
        queryParameters: {'days': days},
      );
      final List data = res.data is List ? res.data : [];
      return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<Booking>> getMyBookingsAsCustomer() async {
    try {
      final res = await _dio.get('/bookings/my-as-customer');
      final List data = res.data is List ? res.data : (res.data['data'] ?? []);
      return data.map((e) => Booking.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }
}
