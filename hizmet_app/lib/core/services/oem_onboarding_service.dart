// Phase 439b — OEM Onboarding Service
//
// Aggressive battery savers (Xiaomi MIUI, Huawei EMUI, Oppo ColorOS, Vivo FuntouchOS,
// OnePlus OxygenOS, Realme) kill background apps even with valid FCM tokens →
// push delivery rate %30-45.  We show a one-time bottom sheet on first FCM grant
// that links to Android's battery optimization exception screen.
//
// Tracking: SharedPreferences flag `_oem_onboard_shown` (don't nag twice).
//
// References:
// - dontkillmyapp.com/problem
// - Permission.ignoreBatteryOptimizations triggers the system intent.

import 'dart:io' show Platform;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OemOnboardingService {
  static const _shownKey = 'oem_onboard_shown_v1';

  /// Manufacturers known to aggressively kill background apps.
  static const _affected = <String>{
    'xiaomi',
    'redmi',
    'poco',
    'huawei',
    'honor',
    'oppo',
    'vivo',
    'oneplus',
    'realme',
    'iqoo',
  };

  /// True if the device manufacturer is on the aggressive-killer list AND
  /// the user has not been prompted before AND the optimization is still on.
  static Future<bool> shouldPrompt() async {
    if (!Platform.isAndroid) return false;
    try {
      final prefs = await SharedPreferences.getInstance();
      if (prefs.getBool(_shownKey) == true) return false;

      final info = await DeviceInfoPlugin().androidInfo;
      final manufacturer = info.manufacturer.toLowerCase();
      if (!_affected.contains(manufacturer)) return false;

      // Already whitelisted? skip.
      final status = await Permission.ignoreBatteryOptimizations.status;
      if (status.isGranted) return false;

      return true;
    } catch (e) {
      if (kDebugMode) debugPrint('[OemOnboarding] shouldPrompt err: $e');
      return false;
    }
  }

  /// Mark the prompt as shown — won't be offered again on this install.
  static Future<void> markShown() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_shownKey, true);
  }

  /// Trigger the system "ignore battery optimizations" prompt.
  /// Returns whether the permission ended up granted.
  static Future<bool> requestBatteryWhitelist() async {
    final status = await Permission.ignoreBatteryOptimizations.request();
    return status.isGranted;
  }

  /// Display manufacturer label for UX copy.
  static Future<String> manufacturerLabel() async {
    try {
      final info = await DeviceInfoPlugin().androidInfo;
      final m = info.manufacturer;
      if (m.isEmpty) return 'Cihazınız';
      return m[0].toUpperCase() + m.substring(1).toLowerCase();
    } catch (_) {
      return 'Cihazınız';
    }
  }
}
