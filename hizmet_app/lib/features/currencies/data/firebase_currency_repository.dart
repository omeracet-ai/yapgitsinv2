// Firebase migration
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

class Currency {
  final String code;
  final String symbol;
  final String name;
  final double rateToBase;
  final bool isActive;

  const Currency({required this.code, required this.symbol, required this.name, required this.rateToBase, this.isActive = true});

  factory Currency.fromJson(Map<String, dynamic> j) => Currency(
        code: (j['code'] as String?) ?? 'TRY',
        symbol: (j['symbol'] as String?) ?? '₺',
        name: (j['name'] as String?) ?? '',
        rateToBase: ((j['rateToBase'] as num?) ?? 1).toDouble(),
        isActive: (j['isActive'] as bool?) ?? true,
      );
}

final firebaseCurrencyRepositoryProvider =
    Provider((_) => FirebaseCurrencyRepository());

final firebaseCurrenciesProvider = FutureProvider<List<Currency>>(
    (ref) => ref.read(firebaseCurrencyRepositoryProvider).getAll());

final firebaseActiveCurrenciesProvider = FutureProvider<List<Currency>>(
    (ref) => ref.read(firebaseCurrencyRepositoryProvider).getActive());

/// Aliases so screens that import this file can use the original provider names.
final currencyRepositoryProvider = firebaseCurrencyRepositoryProvider;
final currenciesProvider = firebaseCurrenciesProvider;

/// Preferred currency state — defaults to 'TRY'.
final preferredCurrencyProvider = StateProvider<String>((ref) => 'TRY');

class FirebaseCurrencyRepository {
  final _fs = FirestoreService.instance;

  Future<List<Currency>> getAll() async {
    final docs = await _fs.query(_fs.col('currencies').orderBy('code'));
    return docs.map(Currency.fromJson).toList();
  }

  Future<List<Currency>> getActive() async {
    final docs = await _fs.query(
      _fs.col('currencies').where('isActive', isEqualTo: true).orderBy('code'),
    );
    return docs.map(Currency.fromJson).toList();
  }

  /// Saves the user's preferred currency to their Firestore profile.
  Future<void> setPreferredCurrency(String code) async {
    final uid = _fs.uid;
    if (uid == null) return;
    await _fs.update('users/$uid', {'preferredCurrency': code});
  }
}
