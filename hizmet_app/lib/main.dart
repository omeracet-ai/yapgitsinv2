import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_mode_provider.dart';
import 'core/router/app_router.dart';
import 'core/services/in_app_notification_service.dart';
import 'core/services/chat_toast_hook.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();
  await initializeDateFormatting('tr_TR', null);
  final prefs = await SharedPreferences.getInstance();
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
    // Phase 80 — bind real-time chat → toast hook (idempotent, auth-gated).
    ref.watch(chatToastHookProvider);

    return MaterialApp.router(
      title: 'Yapgitsin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
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
