import 'dart:async';
import 'package:flutter/material.dart';
import '../widgets/in_app_notification_banner.dart';

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
  }) {
    final overlay = _overlay;
    if (overlay == null) return;

    _dismiss();

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
}
