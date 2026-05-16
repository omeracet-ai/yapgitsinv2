import 'package:flutter/material.dart';
// ignore: depend_on_referenced_packages
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_mode_provider.dart';
import 'core/router/app_router.dart';
import 'core/services/in_app_notification_service.dart';
import 'core/services/chat_toast_hook.dart';
import 'core/services/locale_provider.dart';
import 'core/services/secure_token_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Phase 244 — one-shot legacy SharedPreferences `jwt_token` / `auth_token`
/// → SecureTokenStore migration. After this runs, the SP keys are removed
/// and all call sites must read from SecureTokenStore.
Future<void> _migrateLegacyJwt() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final legacy = prefs.getString('jwt_token') ?? prefs.getString('auth_token');
    final store = SecureTokenStore();
    if (legacy != null && legacy.isNotEmpty) {
      final existing = await store.readToken();
      if (existing == null || existing.isEmpty) {
        await store.writeToken(legacy);
      }
    }
    await prefs.remove('jwt_token');
    await prefs.remove('auth_token');
  } catch (_) {
    // Best-effort; auth flows can recover via re-login.
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await _migrateLegacyJwt();
  await initializeDateFormatting('tr_TR', null);
  await initializeDateFormatting('tr', null);
  await initializeDateFormatting('en', null);
  runApp(
    const ProviderScope(
      child: YapgitsinApp(),
    ),
  );
}

class YapgitsinApp extends ConsumerWidget {
  const YapgitsinApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeProvider);
    // Phase 80 — bind real-time chat → toast hook (idempotent, auth-gated).
    ref.watch(chatToastHookProvider);

    return MaterialApp.router(
      title: 'Yapgitsin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      locale: locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      routerConfig: router,
      builder: (context, child) {
        // Phase 79 — register the root overlay so toast banners work globally.
        return Overlay(
          initialEntries: [
            OverlayEntry(
              builder: (ctx) {
                InAppNotificationService.instance.attach(Overlay.of(ctx));
                return child ?? const SizedBox.shrink();
              },
            ),
          ],
        );
      },
    );
  }
}
