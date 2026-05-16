import 'package:flutter/material.dart';

/// Premium Dark Soft â€” Phase 221 palette.
///
/// TÃ¼m renkler tek noktadan; legacy isimler yeÅŸil + dark surface'e
/// remap edildi, bÃ¶ylece eski referanslar otomatik upgrade olur.
class AppColors {
  // â”€â”€ Brand (vibrant green) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static const Color primary       = Color(0xFF4ADE80);
  static const Color primaryDark   = Color(0xFF22C55E);
  static const Color primaryLight  = Color(0xFFDCFCE7);
  static Color get   primaryGlow   => primary.withValues(alpha: 0.15);

  static const Color secondary     = Color(0xFF161B22);
  static const Color accent        = Color(0xFF4ADE80);

  // â”€â”€ Background (deep dark) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static const Color background       = Color(0xFF0C1117);
  static const Color surface          = Color(0xFF161B22);
  static const Color surfaceElevated  = Color(0xFF1C2128);
  static const Color border           = Color(0xFF30363D);

  // â”€â”€ Text â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static const Color textPrimary   = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted     = Color(0xFF6B7280);
  static const Color textHint      = Color(0xFF6B7280);

  // â”€â”€ Accents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static const Color accentYellow  = Color(0xFFFCD34D);
  static const Color verifiedBlue  = Color(0xFF60A5FA);
  static const Color verifiedGreen = Color(0xFF22C55E);

  // â”€â”€ Status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static const Color success       = Color(0xFF4ADE80);
  static const Color warning       = Color(0xFFFCD34D);
  static const Color error         = Color(0xFFEF4444);

  static const Color statusOpen    = Color(0xFF4ADE80);
  static const Color statusPending = Color(0xFFFCD34D);
  static const Color statusClosed  = Color(0xFF6B7280);
  static const Color statusError   = Color(0xFFEF4444);

  // â”€â”€ Light theme tokens (Legacy support â€” sadeleÅŸtirildi) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static const Color lightBackground     = Color(0xFFF8F9FA);
  static const Color lightSurface        = Colors.white;
  static const Color lightText           = Color(0xFF1A1A1A);
  static const Color lightTextSecondary  = Color(0xFF77838F);
  static const Color lightBorder         = Color(0xFFE7EAF3);

  // â”€â”€ Dark theme tokens (current premium palette) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  static const Color darkBackground       = Color(0xFF0C1117);
  static const Color darkSurface          = Color(0xFF161B22);
  static const Color darkSurfaceElevated  = Color(0xFF1C2128);
  static const Color darkText             = Color(0xFFFFFFFF);
  static const Color darkTextSecondary    = Color(0xFF9CA3AF);
  static const Color darkBorder           = Color(0xFF30363D);
  static const Color darkPrimary          = Color(0xFF4ADE80);

  // â”€â”€ Legacy orange (deprecated â€” eski referanslar yeÅŸile yÃ¶nlendirilir) â”€
  @Deprecated('Eski turuncu marka kapatÄ±ldÄ±; AppColors.primary kullanÄ±n.')
  static const Color legacyOrange = primary;
}
