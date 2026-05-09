import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

final calendarSyncRepositoryProvider = Provider((ref) {
  return CalendarSyncRepository(ref.watch(authRepositoryProvider));
});

class CalendarSyncResult {
  final String calendarUrl;
  final String token;
  CalendarSyncResult(this.calendarUrl, this.token);

  factory CalendarSyncResult.fromJson(Map<String, dynamic> json) =>
      CalendarSyncResult(
        json['calendarUrl']?.toString() ?? '',
        json['token']?.toString() ?? '',
      );
}

/// Phase 155 — Worker Calendar ICS feed (Google/Apple/Outlook subscribe by URL).
class CalendarSyncRepository {
  final AuthRepository _auth;
  final Dio _dio;

  CalendarSyncRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<Options> _opts() async {
    final t = await _auth.getToken();
    return Options(headers: {'Authorization': 'Bearer $t'});
  }

  Future<CalendarSyncResult> enableCalendar() async {
    final res = await _dio.post('/users/me/calendar/enable', options: await _opts());
    return CalendarSyncResult.fromJson(Map<String, dynamic>.from(res.data));
  }

  Future<CalendarSyncResult> regenerateCalendarToken() async {
    final res = await _dio.post('/users/me/calendar/regenerate', options: await _opts());
    return CalendarSyncResult.fromJson(Map<String, dynamic>.from(res.data));
  }

  Future<void> disableCalendar() async {
    await _dio.post('/users/me/calendar/disable', options: await _opts());
  }
}
