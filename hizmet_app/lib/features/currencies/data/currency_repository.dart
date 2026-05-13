import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client_provider.dart';

class Currency {
  final String code;
  final String symbol;
  final String name;
  final double rateToBase;
  final bool isActive;

  const Currency({
    required this.code,
    required this.symbol,
    required this.name,
    required this.rateToBase,
    this.isActive = true,
  });

  factory Currency.fromJson(Map<String, dynamic> j) => Currency(
        code: (j['code'] as String?) ?? 'TRY',
        symbol: (j['symbol'] as String?) ?? '₺',
        name: (j['name'] as String?) ?? '',
        rateToBase: ((j['rateToBase'] as num?) ?? 1).toDouble(),
        isActive: (j['isActive'] as bool?) ?? true,
      );
}

final currencyRepositoryProvider = Provider<CurrencyRepository>((ref) {
  return CurrencyRepository(dio: ref.read(apiClientProvider).dio);
});

final currenciesProvider = FutureProvider<List<Currency>>((ref) async {
  return ref.watch(currencyRepositoryProvider).getCurrencies();
});

final preferredCurrencyProvider = StateProvider<String>((ref) => 'TRY');

class CurrencyRepository {
  final Dio _dio;

  CurrencyRepository({required Dio dio}) : _dio = dio;

  Future<List<Currency>> getCurrencies() async {
    final res = await _dio.get('/currencies');
    return (res.data as List)
        .map((e) => Currency.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<String> setPreferredCurrency(String code) async {
    final res = await _dio.patch(
      '/users/me/currency',
      data: {'code': code},
    );
    return (res.data['preferredCurrency'] as String?) ?? code;
  }
}
