import 'package:flutter/material.dart';

/// Premium Dark Soft — Phase 221 palette.
///
/// Tüm renkler tek noktadan; legacy isimler yeşil + dark surface'e
/// remap edildi, böylece eski referanslar otomatik upgrade olur.
class AppColors {
  // ── Brand (vibrant green) ──────────────────────────────────────────────
  static const Color primary       = Color(0xFF4ADE80);
  static const Color primaryDark   = Color(0xFF22C55E);
  static const Color primaryLight  = Color(0xFFDCFCE7);

  /// Phase 268d — Remote app-config override.
  /// `AppConfigService.fetch()` sonrası `theme.primary` parse edilip set edilir.
  /// Null kalırsa fallback olarak [primary] döner.
  ///
  /// Not: `primary` 54+ yerde `const` context'te (örn. `const Icon(color: ...)`)
  /// kullanıldığından geriye uyumluluk için `const` bırakıldı. Yeni kod
  /// remote override'ı istiyorsa [dynamicPrimary] kullanmalı.
  static Color? overridePrimary;
  static Color get dynamicPrimary => overridePrimary ?? primary;
  /// @Deprecated — kullanım: `AppColors.headerBackground(context)` veya
  /// `AppColors.headerSurface`. Bu sabit her zaman koyu zemin döner ve
  /// light mode'da AppBar'ı bozar. Yeni kod tema-duyarlı getter kullanmalı.
  static const Color headerDark    = Color(0xFF161B22);

  /// Tema-duyarlı header zemini — light'ta beyaz, dark'ta #161B22.
  /// Const olmayan getter; `AppColors.headerSurface` şeklinde çağrılır.
  static Color get headerSurface =>
      _pick(const Color(0xFF161B22), const Color(0xFFFFFFFF));

  /// Header üzerindeki başlık/ikon foreground rengi — light'ta koyu, dark'ta beyaz.
  static Color get headerForeground =>
      _pick(const Color(0xFFFFFFFF), const Color(0xFF161B22));
  static Color get   primaryGlow   => primary.withValues(alpha: 0.15);

  static const Color secondary     = Color(0xFF161B22);
  static const Color accent        = Color(0xFF4ADE80);

  // ── Phase 264 — Tema-duyarlı yüzey/metin token'ları ─────────────────────
  // Aktif tema parlaklığı; main.dart kökte themeMode'dan set eder.
  // Dark VE sistem modu → Brightness.dark; yalnızca "Açık" → Brightness.light.
  //
  // Phase 348 — `brightnessNotifier` paralel kanal eklendi. Static field
  // backward-compat için kalır (50+ const-context referansı), ama mutate
  // ederken ALWAYS notifier.value'yu da güncelle (`setBrightness` helper).
  // Custom widget'lar reactif rebuild için ListenableBuilder ile bu
  // notifier'a abone olabilir (main.dart wrap).
  static final ValueNotifier<Brightness> brightnessNotifier =
      ValueNotifier<Brightness>(Brightness.dark);

  static Brightness get brightness => brightnessNotifier.value;

  /// Phase 348 — Brightness değişikliği için TEK doğru giriş noktası.
  /// `AppColors.brightness = X` deprecated; bunu kullan.
  static void setBrightness(Brightness b) {
    if (brightnessNotifier.value != b) {
      brightnessNotifier.value = b;
    }
  }

  static bool get _isDark => brightnessNotifier.value == Brightness.dark;
  static Color _pick(Color dark, Color light) => _isDark ? dark : light;

  // ── Background / surface (tema-duyarlı) ────────────────────────────────
  static Color get background      =>
      _pick(const Color(0xFF0C1117), const Color(0xFFF8F9FA));
  static Color get surface         =>
      _pick(const Color(0xFF161B22), const Color(0xFFFFFFFF));
  static Color get surfaceElevated =>
      _pick(const Color(0xFF1C2128), const Color(0xFFF1F3F5));
  static Color get border          =>
      _pick(const Color(0xFF30363D), const Color(0xFFE5E7EB));

  // ── Text (tema-duyarlı) ─────────────────────────────────────────────────
  static Color get textPrimary   =>
      _pick(const Color(0xFFFFFFFF), const Color(0xFF161B22));
  static Color get textSecondary =>
      _pick(const Color(0xFF9CA3AF), const Color(0xFF6B7280));
  static Color get textMuted     =>
      _pick(const Color(0xFF6B7280), const Color(0xFF6B7280));
  static Color get textHint      =>
      _pick(const Color(0xFF6B7280), const Color(0xFF9CA3AF));

  // ── Accents ────────────────────────────────────────────────────────────
  static const Color accentYellow  = Color(0xFFFCD34D);
  static const Color verifiedBlue  = Color(0xFF60A5FA);
  static const Color verifiedGreen = Color(0xFF22C55E);

  // ── Status ─────────────────────────────────────────────────────────────
  static const Color success       = Color(0xFF4ADE80);
  static const Color warning       = Color(0xFFFCD34D);
  static const Color error         = Color(0xFFEF4444);

  static const Color statusOpen    = Color(0xFF4ADE80);
  static const Color statusPending = Color(0xFFFCD34D);
  static const Color statusClosed  = Color(0xFF6B7280);
  static const Color statusError   = Color(0xFFEF4444);

  // ── Light* aliases — artık tema-duyarlı token'lara yönlenir ────────────
  static Color get lightBackground     => background;
  static Color get lightSurface        => surface;
  static Color get lightText           => textPrimary;
  static Color get lightTextSecondary  => textSecondary;
  static Color get lightBorder         => border;

  // ── Dark theme tokens (current premium palette) ────────────────────────
  static const Color darkBackground       = Color(0xFF0C1117);
  static const Color darkSurface          = Color(0xFF161B22);
  static const Color darkSurfaceElevated  = Color(0xFF1C2128);
  static const Color darkText             = Color(0xFFFFFFFF);
  static const Color darkTextSecondary    = Color(0xFF9CA3AF);
  static const Color darkBorder           = Color(0xFF30363D);
  static const Color darkPrimary          = Color(0xFF4ADE80);

  // ── Legacy orange (deprecated — eski referanslar yeşile yönlendirilir) ─
  @Deprecated('Eski turuncu marka kapatıldı; AppColors.primary kullanın.')
  static const Color legacyOrange = primary;

  // ── Phase 263/264 — Ana sekme header arka planı (tema-duyarlı) ─────────
  /// Tüm uygulama AppBar/header zemini. Light → beyaz, Dark → #161B22.
  /// Foreground rengi için `AppColors.headerForeground` kullanın.
  static Color headerBackground(BuildContext context) => headerSurface;
}
