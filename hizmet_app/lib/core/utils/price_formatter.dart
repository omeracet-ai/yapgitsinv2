import '../../features/currencies/data/currency_repository.dart';

/// Fiyatı tercih edilen para birimine çevirir ve biçimlendirir.
///
/// [amountTry] backend'den gelen TL cinsi tutar (base TRY).
/// [currencyCode] kullanıcının tercih ettiği currency kodu (TRY/USD/EUR/...).
/// [currencies] /currencies endpoint'inden çekilmiş aktif liste.
String formatPrice(
  double amountTry,
  String currencyCode,
  List<Currency> currencies,
) {
  if (currencies.isEmpty) {
    return _trFormat(amountTry, '₺');
  }
  final cur = currencies.firstWhere(
    (c) => c.code == currencyCode,
    orElse: () => currencies.firstWhere(
      (c) => c.code == 'TRY',
      orElse: () => currencies.first,
    ),
  );
  final converted = amountTry * cur.rateToBase;
  // TRY için Türkçe binlik ayraç, diğerleri için sembol-prefix.
  if (cur.code == 'TRY') return _trFormat(converted, cur.symbol);
  return '${cur.symbol}${converted.toStringAsFixed(2)}';
}

String _trFormat(double amount, String symbol) {
  final fixed = amount.toStringAsFixed(2);
  final parts = fixed.split('.');
  final intPart = parts[0];
  final dec = parts.length > 1 ? parts[1] : '00';
  // 1.250,00 ₺ stili: binlik nokta, ondalık virgül.
  final buf = StringBuffer();
  final neg = intPart.startsWith('-');
  final digits = neg ? intPart.substring(1) : intPart;
  for (int i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buf.write('.');
    buf.write(digits[i]);
  }
  final sign = neg ? '-' : '';
  return '$sign${buf.toString()},$dec $symbol';
}
