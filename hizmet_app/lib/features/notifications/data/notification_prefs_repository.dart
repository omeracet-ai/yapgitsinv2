import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

/// Map<String, bool> with 5 known keys: booking, offer, review, message, system.
typedef NotificationPrefs = Map<String, bool>;

const List<String> kNotificationPrefKeys = [
  'booking',
  'offer',
  'review',
  'message',
  'system',
];

NotificationPrefs allEnabledPrefs() =>
    {for (final k in kNotificationPrefKeys) k: true};

class NotificationPrefsRepository {
  NotificationPrefsRepository(this._ref);
  final Ref _ref;

  Dio _dio(String token) => Dio(BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 8),
        headers: {'Authorization': 'Bearer $token'},
      ));

  Future<NotificationPrefs> fetch() async {
    final token = await _ref.read(authRepositoryProvider).getToken();
    if (token == null) return allEnabledPrefs();
    final res = await _dio(token).get('/users/me/notification-preferences');
    final raw = res.data['preferences'];
    return _parse(raw);
  }

  Future<NotificationPrefs> update(NotificationPrefs prefs) async {
    final token = await _ref.read(authRepositoryProvider).getToken();
    if (token == null) return prefs;
    final res = await _dio(token).patch(
      '/users/me/notification-preferences',
      data: {'preferences': prefs},
    );
    return _parse(res.data['preferences']);
  }

  NotificationPrefs _parse(dynamic raw) {
    final result = allEnabledPrefs();
    if (raw is Map) {
      for (final k in kNotificationPrefKeys) {
        final v = raw[k];
        if (v is bool) result[k] = v;
      }
    }
    return result;
  }
}

final notificationPrefsRepositoryProvider =
    Provider<NotificationPrefsRepository>(
        (ref) => NotificationPrefsRepository(ref));
