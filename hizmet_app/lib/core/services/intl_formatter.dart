import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// P190/4 — Locale-aware formatting helpers backed by `package:intl`.
///
/// Call [initLocales] from `main()` before `runApp` so the date-symbol
/// tables for `tr` and `en` are loaded. All instance methods read the
/// current locale from the [BuildContext] so format output follows the
/// in-app `Localizations.localeOf(context)` automatically.
class IntlFormatter {
  static String date(BuildContext context, DateTime dt) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    return DateFormat.yMMMd(locale).format(dt);
  }

  static String time(BuildContext context, DateTime dt) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    return DateFormat.Hm(locale).format(dt);
  }

  static String dateTime(BuildContext context, DateTime dt) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    return DateFormat.yMMMd(locale).add_Hm().format(dt);
  }

  static String currency(
    BuildContext context,
    num amount, {
    String currencyCode = 'TRY',
    int decimalDigits = 2,
  }) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    final symbol = currencyCode == 'TRY' ? '₺' : currencyCode;
    return NumberFormat.currency(
      locale: locale,
      symbol: symbol,
      decimalDigits: decimalDigits,
    ).format(amount);
  }

  /// Phase 294 — Context-free Turkish TL formatter for budgets, offer prices,
  /// counter prices. Uses `tr_TR` locale → thousand dots, decimal comma.
  /// Example: 1234.5 → "1.234,50 ₺" (decimals=2) or "1.235 ₺" (decimals=0).
  static String tl(num amount, {int decimalDigits = 0}) {
    return NumberFormat.currency(
      locale: 'tr_TR',
      symbol: '₺',
      decimalDigits: decimalDigits,
    ).format(amount);
  }

  /// Phase 294 — Aralık formatlayıcı (min – max ₺). Tek tarafta null verilirse
  /// sadece dolu tarafı raporlar; ikisi de null ise "Belirtilmemiş".
  static String tlRange(num? min, num? max, {int decimalDigits = 0}) {
    if (min != null && max != null) {
      return '${tl(min, decimalDigits: decimalDigits).replaceAll(' ₺', '')} – ${tl(max, decimalDigits: decimalDigits)}';
    }
    if (min != null) return tl(min, decimalDigits: decimalDigits);
    if (max != null) return tl(max, decimalDigits: decimalDigits);
    return 'Belirtilmemiş';
  }

  static String compactNumber(BuildContext context, num n) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    return NumberFormat.compact(locale: locale).format(n);
  }

  static String relativeTime(BuildContext context, DateTime dt, {DateTime? now}) {
    final n = now ?? DateTime.now();
    final diff = n.difference(dt);
    final locale = Localizations.localeOf(context).languageCode;
    if (locale == 'tr') {
      if (diff.inMinutes < 1) return 'az önce';
      if (diff.inMinutes < 60) return '${diff.inMinutes} dk önce';
      if (diff.inHours < 24) return '${diff.inHours} saat önce';
      if (diff.inDays < 7) return '${diff.inDays} gün önce';
      return DateFormat.yMMMd('tr').format(dt);
    }
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat.yMMMd('en').format(dt);
  }
}
