import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

final calendarSyncRepositoryProvider = Provider((ref) {
  return CalendarSyncRepository(dio: ref.read(apiClientProvider).dio);
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
  final Dio _dio;

  CalendarSyncRepository({required Dio dio}) : _dio = dio;

  Future<CalendarSyncResult> enableCalendar() async {
    final res = await _dio.post('/users/me/calendar/enable');
    return CalendarSyncResult.fromJson(Map<String, dynamic>.from(res.data));
  }

  Future<CalendarSyncResult> regenerateCalendarToken() async {
    final res = await _dio.post('/users/me/calendar/regenerate');
    return CalendarSyncResult.fromJson(Map<String, dynamic>.from(res.data));
  }

  Future<void> disableCalendar() async {
    await _dio.post('/users/me/calendar/disable');
  }
}
