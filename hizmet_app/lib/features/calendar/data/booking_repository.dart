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
