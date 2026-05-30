import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

/// Phase 295 — Fiyat TextField'leri için canlı TR formatlayıcı.
///
/// - Sadece rakam ve tek bir virgül kabul eder.
/// - İntegrer kısmı binlik nokta ile gruplar: `1.234.567`
/// - Ondalık kısmı virgül sonrası en fazla 2 hane (varsayılan).
/// - Kullanıcı `1500` yazınca alan `1.500` olarak yenilenir; cursor sonda kalır.
///
/// Submit aşamasında değeri parse etmek için [parseTry] kullan:
/// ```dart
/// final v = TurkishCurrencyInputFormatter.parseTry(controller.text);
/// ```
class TurkishCurrencyInputFormatter extends TextInputFormatter {
  final int maxDecimalDigits;
  TurkishCurrencyInputFormatter({this.maxDecimalDigits = 2});

  static final NumberFormat _intGroupFormat =
      NumberFormat.decimalPattern('tr_TR');

  /// Format edilmiş TR text → double. `"1.234,56"` → `1234.56`.
  /// Geçersiz / boş giriş → null.
  static double? parseTry(String formatted) {
    if (formatted.isEmpty) return null;
    final cleaned = formatted.replaceAll('.', '').replaceAll(',', '.');
    return double.tryParse(cleaned);
  }

  /// Numerik değeri TR formatına çevirir (controller.text'e set etmek için).
  /// Tam sayıysa "1.500", ondalıklıysa "1.500,75". Negatif/NaN → boş.
  static String formatNumber(num? value, {int maxDecimals = 2}) {
    if (value == null || !value.isFinite || value < 0) return '';
    final intPart = value.truncate();
    final intStr = _intGroupFormat.format(intPart);
    final fractional = value - intPart;
    if (fractional <= 0) return intStr;
    final dec = fractional
        .toStringAsFixed(maxDecimals)
        .substring(2)
        .replaceAll(RegExp(r'0+$'), '');
    return dec.isEmpty ? intStr : '$intStr,$dec';
  }

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final raw = newValue.text;
    if (raw.isEmpty) return newValue;

    // 1) Sadece rakam ve virgül izinli.
    var cleaned = raw.replaceAll(RegExp(r'[^0-9,]'), '');

    // 2) En fazla 1 virgül.
    final firstComma = cleaned.indexOf(',');
    if (firstComma != -1) {
      final before = cleaned.substring(0, firstComma);
      final after = cleaned.substring(firstComma + 1).replaceAll(',', '');
      cleaned = '$before,$after';
    }

    // 3) Integer + decimal ayır.
    String intPart;
    String? decPart;
    final commaIdx = cleaned.indexOf(',');
    if (commaIdx == -1) {
      intPart = cleaned;
    } else {
      intPart = cleaned.substring(0, commaIdx);
      decPart = cleaned.substring(commaIdx + 1);
      if (decPart.length > maxDecimalDigits) {
        decPart = decPart.substring(0, maxDecimalDigits);
      }
    }

    // 4) Integer baştaki gereksiz sıfırları temizle ("007" → "7", "0,5" → "0,5").
    if (intPart.length > 1) {
      intPart = intPart.replaceFirst(RegExp(r'^0+'), '');
      if (intPart.isEmpty) intPart = '0';
    }

    // 5) Integer'ı grupla.
    String grouped;
    if (intPart.isEmpty) {
      grouped = '';
    } else {
      final n = int.tryParse(intPart);
      grouped = n == null ? intPart : _intGroupFormat.format(n);
    }

    final out = decPart == null ? grouped : '$grouped,$decPart';

    return TextEditingValue(
      text: out,
      selection: TextSelection.collapsed(offset: out.length),
    );
  }
}
