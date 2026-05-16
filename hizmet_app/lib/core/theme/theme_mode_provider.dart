import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _prefsKey = 'theme_mode';

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  // LIGHT_THEME_INCOMPLETE: forced to dark until app_theme.dart lightTheme is fleshed out. Remove this guard + restore ThemeMode.system when lightTheme covers inputDecoration/card/appBar/divider.
  ThemeModeNotifier() : super(ThemeMode.dark) {
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsKey);
      state = _decode(raw);
    } catch (e, st) {
      debugPrint('theme_mode_provider._load: $e\n$st');
    }
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, _encode(mode));
    } catch (e, st) {
      debugPrint('theme_mode_provider.setMode: $e\n$st');
    }
  }

  static String _encode(ThemeMode m) {
    switch (m) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }

  static ThemeMode _decode(String? s) {
    switch (s) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
        return ThemeMode.system;
      default:
        // LIGHT_THEME_INCOMPLETE: no saved pref → dark (not system) until lightTheme is complete.
        return ThemeMode.dark;
    }
  }
}

final themeModeProvider =
    StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier();
});

String themeModeLabel(ThemeMode mode) {
  switch (mode) {
    case ThemeMode.light:
      return 'Açık';
    case ThemeMode.dark:
      return 'Koyu';
    case ThemeMode.system:
      return 'Sistem';
  }
}
