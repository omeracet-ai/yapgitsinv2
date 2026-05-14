import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// SharedPreferences key for the persisted locale code.
const String kLocalePrefsKey = 'app_locale';

/// Default locale — Turkish.
const Locale kDefaultLocale = Locale('tr');

/// Supported locale codes for the in-app language switcher.
const List<Locale> kSupportedAppLocales = <Locale>[
  Locale('tr'),
  Locale('en'),
  Locale('az'),
];

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier() : super(kDefaultLocale) {
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(kLocalePrefsKey);
      if (raw == null || raw.isEmpty) return;
      state = _decode(raw);
    } catch (e, st) {
      debugPrint('locale_provider._load: $e\n$st');
    }
  }

  Future<void> setLocale(Locale locale) async {
    state = locale;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(kLocalePrefsKey, locale.languageCode);
    } catch (e, st) {
      debugPrint('locale_provider.setLocale: $e\n$st');
    }
  }

  static Locale _decode(String code) {
    switch (code) {
      case 'en':
        return const Locale('en');
      case 'az':
        return const Locale('az');
      case 'tr':
        return const Locale('tr');
      default:
        return kDefaultLocale;
    }
  }
}

final localeProvider =
    StateNotifierProvider<LocaleNotifier, Locale>((ref) => LocaleNotifier());

/// Human-readable label for a locale (used in switcher UI).
String localeLabel(Locale locale) {
  switch (locale.languageCode) {
    case 'en':
      return 'English';
    case 'az':
      return 'Azərbaycan';
    case 'tr':
    default:
      return 'Türkçe';
  }
}
