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
  static Color get   primaryGlow   => primary.withOpacity(0.15);

  static const Color secondary     = Color(0xFF161B22);
  static const Color accent        = Color(0xFF4ADE80);

  // ── Background (deep dark) ─────────────────────────────────────────────
  static const Color background       = Color(0xFF0C1117);
  static const Color surface          = Color(0xFF161B22);
  static const Color surfaceElevated  = Color(0xFF1C2128);
  static const Color border           = Color(0xFF30363D);

  // ── Text ───────────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted     = Color(0xFF6B7280);
  static const Color textHint      = Color(0xFF6B7280);

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

  // ── Light theme tokens (Legacy support — sadeleştirildi) ───────────────
  static const Color lightBackground     = Color(0xFFF8F9FA);
  static const Color lightSurface        = Colors.white;
  static const Color lightText           = Color(0xFF1A1A1A);
  static const Color lightTextSecondary  = Color(0xFF77838F);
  static const Color lightBorder         = Color(0xFFE7EAF3);

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
}
