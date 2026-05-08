import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

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
  return CurrencyRepository(ref.watch(authRepositoryProvider));
});

final currenciesProvider = FutureProvider<List<Currency>>((ref) async {
  return ref.watch(currencyRepositoryProvider).getCurrencies();
});

final preferredCurrencyProvider = StateProvider<String>((ref) => 'TRY');

class CurrencyRepository {
  final AuthRepository _auth;
  final Dio _dio;

  CurrencyRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<List<Currency>> getCurrencies() async {
    final res = await _dio.get('/currencies');
    return (res.data as List)
        .map((e) => Currency.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<String> setPreferredCurrency(String code) async {
    final t = await _auth.getToken();
    final res = await _dio.patch(
      '/users/me/currency',
      data: {'code': code},
      options: Options(headers: {'Authorization': 'Bearer $t'}),
    );
    return (res.data['preferredCurrency'] as String?) ?? code;
  }
}
