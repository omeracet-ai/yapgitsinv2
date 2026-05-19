// Phase 253 — In-app notification sound player.
//
// Plays a short asset clip based on the backend-provided `soundTag` data field
// of an incoming FCM message. Silently no-ops on failure so missing assets or
// platform issues never break the notification banner UX.
//
// Asset slots (see assets/sounds/):
//   - offer.mp3   : NEW_OFFER / COUNTER_OFFER
//   - accept.mp3  : OFFER_ACCEPTED / BOOKING_CONFIRMED
//   - release.mp3 : JOB_COMPLETED / BOOKING_COMPLETED (escrow released)
//   - alert.mp3   : everything else (SYSTEM, withdrawal, dispute, etc.)

import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';

class SoundPlayer {
  SoundPlayer._();
  static final SoundPlayer instance = SoundPlayer._();

  AudioPlayer? _player;

  static const Map<String, String> _assetFor = {
    'offer': 'assets/sounds/offer.mp3',
    'accept': 'assets/sounds/accept.mp3',
    'release': 'assets/sounds/release.mp3',
    'alert': 'assets/sounds/alert.mp3',
  };

  Future<void> play(String? tag) async {
    final asset = _assetFor[tag ?? 'alert'] ?? _assetFor['alert']!;
    try {
      _player ??= AudioPlayer();
      await _player!.setAsset(asset);
      await _player!.seek(Duration.zero);
      // Fire-and-forget; do not await play() so banner UI is not blocked.
      // ignore: unawaited_futures
      _player!.play();
    } catch (err) {
      if (kDebugMode) debugPrint('SoundPlayer.play($tag) skipped: $err');
    }
  }

  Future<void> dispose() async {
    try {
      await _player?.dispose();
    } catch (_) {}
    _player = null;
  }
}
