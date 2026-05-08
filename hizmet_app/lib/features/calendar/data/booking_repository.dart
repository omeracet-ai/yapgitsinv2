import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/models/booking_model.dart';
import '../../auth/data/auth_repository.dart';

final bookingRepositoryProvider = Provider((ref) {
  return BookingRepository(ref.watch(authRepositoryProvider));
});

final myWorkerBookingsProvider = FutureProvider<List<Booking>>((ref) async {
  return ref.watch(bookingRepositoryProvider).getMyBookingsAsWorker();
});

final myCustomerBookingsProvider = FutureProvider<List<Booking>>((ref) async {
  return ref.watch(bookingRepositoryProvider).getMyBookingsAsCustomer();
});

class BookingRepository {
  final AuthRepository _auth;
  final Dio _dio;

  BookingRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<Options> _authOpts() async {
    final t = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $t'});
  }

  Future<List<Booking>> getMyBookingsAsWorker() async {
    try {
      final res = await _dio.get('/bookings/my-as-worker', options: await _authOpts());
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

    final res = await _dio.post('/bookings', data: body, options: await _authOpts());
    return Booking.fromJson(res.data as Map<String, dynamic>);
  }

  /// Phase 128 — cancel a booking with reason; returns refund preview from server.
  Future<Map<String, dynamic>> cancelBooking(
      String bookingId, String reason) async {
    final res = await _dio.post(
      '/bookings/$bookingId/cancel',
      data: {'reason': reason},
      options: await _authOpts(),
    );
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<Booking>> getMyBookingsAsCustomer() async {
    try {
      final res = await _dio.get('/bookings/my-as-customer', options: await _authOpts());
      final List data = res.data is List ? res.data : (res.data['data'] ?? []);
      return data.map((e) => Booking.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }
}
