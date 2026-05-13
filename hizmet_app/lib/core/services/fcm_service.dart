// Phase 113 — Firebase Cloud Messaging service (mobile push notifications).
//
// This is a defensive scaffold: Firebase init, permission request, token
// fetch and listener registration are all guarded with try/catch so the
// app keeps working on platforms where Firebase isn't configured (web,
// windows desktop, or builds without google-services.json).
//
// Real platform setup (Android google-services.json / iOS GoogleService-Info.plist)
// is documented in `FCM_SETUP.md`.

import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

// ignore_for_file: depend_on_referenced_packages, avoid_dynamic_calls
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../constants/api_constants.dart';
import 'in_app_notification_service.dart';
import 'secure_token_store.dart';

class FcmService {
  FcmService._();
  static final FcmService instance = FcmService._();

  bool _initialized = false;
  String? _lastToken;
  StreamSubscription<RemoteMessage>? _foregroundSub;
  StreamSubscription<String>? _tokenRefreshSub;

  /// Initialize Firebase, request permission, fetch FCM token and register
  /// it with the backend. Silently no-ops on failure (web / desktop / missing
  /// platform config).
  Future<void> init() async {
    if (_initialized) return;
    try {
      await Firebase.initializeApp();
      final messaging = FirebaseMessaging.instance;

      // iOS / Android 13+ permission prompt — auto-granted on older Android.
      try {
        await messaging.requestPermission(
          alert: true,
          badge: true,
          sound: true,
        );
      } catch (e, st) {
        debugPrint('fcm_service.init.requestPermission: $e\n$st');
      }

      // Foreground messages — bridge into the existing in-app banner.
      _foregroundSub = FirebaseMessaging.onMessage.listen((msg) {
        final n = msg.notification;
        final title = n?.title ?? msg.data['title']?.toString() ?? 'Bildirim';
        final body = n?.body ?? msg.data['body']?.toString() ?? '';
        final type = msg.data['type']?.toString();
        InAppNotificationService.instance.show(
          title: title,
          message: body,
          type: type,
        );
      });

      // Auto-resync if FCM rotates the token.
      _tokenRefreshSub = messaging.onTokenRefresh.listen((t) {
        _registerToken(t);
      });

      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) {
        await _registerToken(token);
      }
      _initialized = true;
      if (kDebugMode) {
        debugPrint('FCM initialized — token=${token?.substring(0, 12)}…');
      }
    } catch (err) {
      if (kDebugMode) debugPrint('FCM init skipped: $err');
      // Silent skip — push simply won't work this run.
    }
  }

  Future<void> _registerToken(String token) async {
    _lastToken = token;
    try {
      // P189/4 — singleton has no Ref scope; read auth token from
      // SecureTokenStore (canonical) and attach Bearer manually.
      final jwt = await SecureTokenStore().readToken();
      if (jwt == null || jwt.isEmpty) return;
      final dio = Dio();
      await dio.post(
        '${ApiConstants.baseUrl}/users/me/fcm-token',
        data: {'token': token},
        options: Options(headers: {'Authorization': 'Bearer $jwt'}),
      );
    } catch (err) {
      if (kDebugMode) debugPrint('FCM token register failed: $err');
    }
  }

  /// Called on logout — drop the device token from the backend so we don't
  /// keep pushing to a logged-out user.
  Future<void> unregister() async {
    final token = _lastToken;
    if (token == null) return;
    try {
      final jwt = await SecureTokenStore().readToken();
      if (jwt != null && jwt.isNotEmpty) {
        final dio = Dio();
        await dio.delete(
          '${ApiConstants.baseUrl}/users/me/fcm-token',
          data: {'token': token},
          options: Options(headers: {'Authorization': 'Bearer $jwt'}),
        );
      }
    } catch (e, st) {
      debugPrint('fcm_service.unregister: $e\n$st');
    }
    await _foregroundSub?.cancel();
    await _tokenRefreshSub?.cancel();
    _foregroundSub = null;
    _tokenRefreshSub = null;
    _initialized = false;
    _lastToken = null;
  }
}
