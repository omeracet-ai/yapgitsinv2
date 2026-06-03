import 'package:flutter/material.dart';
// ignore: depend_on_referenced_packages
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/theme_mode_provider.dart';
import 'core/app_config/app_config_service.dart';
import 'core/app_config/app_config_socket.dart';
import 'core/router/app_router.dart';
import 'core/services/in_app_notification_service.dart';
import 'core/services/chat_toast_hook.dart';
import 'core/services/locale_provider.dart';
import 'core/services/secure_token_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Phase 267 — Tab düzeni değişti (5→4 sekme + Harita eklendi). Eski APK
/// kullanıcılarının `selectedTabProvider`/cached auth state'i yeni index
/// haritasına uyumsuz olabileceği için tek seferlik logout zorlaması.
/// Flag bump edilirse: token silinir → kullanıcı login ekranına düşer.
const String _kAppVersionGate = '267_map_tab_2026_05_27';

Future<void> _enforceVersionGate() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final last = prefs.getString('last_gate');
    if (last == _kAppVersionGate) return;
    // Yeni gate → secure token + SP auth alanlarını temizle.
    try {
      await SecureTokenStore().clear();
    } catch (_) {}
    await prefs.remove('jwt_token');
    await prefs.remove('auth_token');
    await prefs.remove('selected_tab');
    await prefs.setString('last_gate', _kAppVersionGate);
  } catch (_) {
    // Best-effort; auth init kendi recovery'sini yapacak.
  }
}

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
  await _enforceVersionGate();
  await _migrateLegacyJwt();
  await initializeDateFormatting('tr_TR', null);
  await initializeDateFormatting('tr', null);
  await initializeDateFormatting('en', null);
  // Phase 268d — Remote app-config fire-and-forget fetch.
  // Boot path bloklanmaz; cache/fallback ile UI hemen render olur,
  // network cevabı geldiğinde override AppColors'a yazılır.
  // ignore: discarded_futures
  _bootstrapAppConfig();
  runApp(
    const ProviderScope(
      child: YapgitsinApp(),
    ),
  );
}

Future<void> _bootstrapAppConfig() async {
  try {
    final cfg = await AppConfigService().fetch();
    final hex = cfg.theme['primary'];
    if (hex is String) {
      final parsed = _parseHexColor(hex);
      if (parsed != null) {
        AppColors.overridePrimary = parsed;
      }
    }
  } catch (_) {
    // Sessiz: fallback zaten devrede.
  }
}

Color? _parseHexColor(String input) {
  var s = input.trim();
  if (s.startsWith('#')) s = s.substring(1);
  if (s.length == 6) s = 'FF$s';
  if (s.length != 8) return null;
  final v = int.tryParse(s, radix: 16);
  if (v == null) return null;
  return Color(v);
}

class YapgitsinApp extends ConsumerWidget {
  const YapgitsinApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);
    final locale = ref.watch(localeProvider);
    // Phase 348 — `setBrightness` ValueNotifier üzerinden mutate eder;
    // builder altındaki ListenableBuilder tüm subtree'yi reactif rebuild
    // eder → custom widget'lar (AppColors getter okuyanlar) anında yeni
    // değerlerle re-paint olur, "yarım render" sorunu kalmaz.
    AppColors.setBrightness(
      themeMode == ThemeMode.light ? Brightness.light : Brightness.dark,
    );
    // Phase 80 — bind real-time chat → toast hook (idempotent, auth-gated).
    ref.watch(chatToastHookProvider);
    // App-config socket — admin save → instant config refresh.
    ref.watch(appConfigSocketProvider);

    return MaterialApp.router(
      title: 'Yapgitsin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      // Sistem ve Koyu → dark (mevcut tasarım korunur); yalnızca "Açık" → light.
      themeMode:
          themeMode == ThemeMode.light ? ThemeMode.light : ThemeMode.dark,
      // Phase 337 — Dark/Light geçişlerde "parça parça yükleme" bug fix.
      // Default 200ms theme animasyonu Material widget'ları tween'liyor ama
      // AppColors static getter'ları anında sıçrıyor → render desync.
      // Animasyonu sıfırla → tek frame'de atomik geçiş, görsel tutarlılık.
      themeAnimationDuration: Duration.zero,
      themeAnimationCurve: Curves.linear,
      locale: locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      routerConfig: router,
      builder: (context, child) {
        // Phase 79 — register the root overlay so toast banners work globally.
        // Phase 348 — `ListenableBuilder` OverlayEntry'nin İÇİNDE; brightness
        // değişiminde Overlay state'i (toast banner stack vb.) korunur,
        // sadece route içeriği reactif rebuild olur. Custom widget'ların
        // `AppColors.*` getter okuyanları taze değerle re-paint eder.
        return Overlay(
          initialEntries: [
            OverlayEntry(
              builder: (ctx) {
                InAppNotificationService.instance.attach(Overlay.of(ctx));
                // Phase 379 — KeyedSubtree brightness key. ListenableBuilder
                // tek başına `child` referansını koruyordu → Flutter element
                // diffing derin subtree'de bazı widget'ları (RepaintBoundary,
                // sliver, KeepAlive) dirty marklamıyor, "parça parça" repaint.
                // ValueKey(brightness) değişince Flutter subtree'yi zorla
                // yeniden inşa eder; AppColors getter'ları taze değer döner.
                return ListenableBuilder(
                  listenable: AppColors.brightnessNotifier,
                  builder: (_, __) => KeyedSubtree(
                    key: ValueKey(AppColors.brightnessNotifier.value),
                    child: child ?? const SizedBox.shrink(),
                  ),
                );
              },
            ),
          ],
        );
      },
    );
  }
}
