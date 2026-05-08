import 'package:shared_preferences/shared_preferences.dart';

/// Onboarding tanıtım turunun gösterilip gösterilmediğini saklar.
/// Router redirect ve OnboardingScreen `_finish()` tarafından kullanılır.
class OnboardingStorage {
  static const _key = 'onboarding_done';

  static Future<bool> hasSeenOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_key) == true;
  }

  static Future<void> markSeen() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_key, true);
  }

  static Future<void> reset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
