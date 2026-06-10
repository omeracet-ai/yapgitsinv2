import 'dart:async';
import 'package:flutter/material.dart';
import '../widgets/in_app_notification_banner.dart';
import 'sound_player.dart';

/// Phase 79 — Global in-app toast banner service.
///
/// Holds a reference to the root [OverlayState] and exposes [show] which
/// inserts a slide-in [InAppNotificationBanner] for ~4 seconds. Only one
/// banner is visible at a time; calling [show] again replaces the current.
class InAppNotificationService {
  InAppNotificationService._();
  static final InAppNotificationService instance = InAppNotificationService._();

  OverlayState? _overlay;
  OverlayEntry? _current;
  Timer? _dismissTimer;

  /// Register the root overlay (called from MaterialApp.router builder).
  void attach(OverlayState overlay) {
    _overlay = overlay;
  }

  void show({
    required String title,
    required String message,
    String? type,
    VoidCallback? onTap,
    Duration duration = const Duration(seconds: 4),
    // Phase 504 — varsayılan olarak ses çal. FCM foreground'da SoundPlayer
    // çağrısı zaten ayrı yapıldığı için fcm_service `playSound: false`
    // geçer, böylece çift ses olmaz.
    bool playSound = true,
  }) {
    final overlay = _overlay;
    if (overlay == null) return;

    _dismiss();

    // Phase 504 — mesaj / bildirim için sistem default sesi.
    // soundTag yoksa type'a göre seç: new_message → alert, diğer → alert.
    if (playSound) {
      final tag = _soundTagFor(type);
      // ignore: unawaited_futures
      SoundPlayer.instance.play(tag);
    }

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (_) => InAppNotificationBanner(
        title: title,
        message: message,
        type: type,
        onTap: () {
          _dismiss();
          onTap?.call();
        },
        onDismiss: _dismiss,
      ),
    );
    _current = entry;
    overlay.insert(entry);
    _dismissTimer = Timer(duration, _dismiss);
  }

  void _dismiss() {
    _dismissTimer?.cancel();
    _dismissTimer = null;
    final entry = _current;
    if (entry != null && entry.mounted) entry.remove();
    _current = null;
  }

  /// Phase 504 — Notification type → SoundPlayer tag.
  /// Backend NotificationsService.soundTagFor() ile aynı eşleme.
  String _soundTagFor(String? type) {
    switch (type) {
      case 'new_offer':
      case 'counter_offer':
        return 'offer';
      case 'offer_accepted':
      case 'booking_confirmed':
        return 'accept';
      case 'job_completed':
      case 'booking_completed':
        return 'release';
      default:
        return 'alert';
    }
  }
}
