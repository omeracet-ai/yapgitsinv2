import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../auth/data/auth_repository.dart';

class MonthlyPoint {
  final String month; // YYYY-MM
  final double earnings;
  final int count;
  MonthlyPoint({required this.month, required this.earnings, required this.count});
  factory MonthlyPoint.fromJson(Map<String, dynamic> j) => MonthlyPoint(
        month: (j['month'] as String?) ?? '',
        earnings: ((j['earnings'] as num?) ?? 0).toDouble(),
        count: ((j['count'] as num?) ?? 0).toInt(),
      );
}

class CategoryEarning {
  final String category;
  final double earnings;
  final int count;
  CategoryEarning({required this.category, required this.earnings, required this.count});
  factory CategoryEarning.fromJson(Map<String, dynamic> j) => CategoryEarning(
        category: (j['category'] as String?) ?? 'Diğer',
        earnings: ((j['earnings'] as num?) ?? 0).toDouble(),
        count: ((j['count'] as num?) ?? 0).toInt(),
      );
}

class EarningsData {
  final double totalEarnings;
  final double thisMonthEarnings;
  final double lastMonthEarnings;
  final double growthPercent;
  final int completedJobsCount;
  final int thisMonthCount;
  final List<MonthlyPoint> monthlySeries;
  final List<CategoryEarning> topCategories;
  final double averageJobValue;

  EarningsData({
    required this.totalEarnings,
    required this.thisMonthEarnings,
    required this.lastMonthEarnings,
    required this.growthPercent,
    required this.completedJobsCount,
    required this.thisMonthCount,
    required this.monthlySeries,
    required this.topCategories,
    required this.averageJobValue,
  });

  factory EarningsData.fromJson(Map<String, dynamic> j) => EarningsData(
        totalEarnings: ((j['totalEarnings'] as num?) ?? 0).toDouble(),
        thisMonthEarnings: ((j['thisMonthEarnings'] as num?) ?? 0).toDouble(),
        lastMonthEarnings: ((j['lastMonthEarnings'] as num?) ?? 0).toDouble(),
        growthPercent: ((j['growthPercent'] as num?) ?? 0).toDouble(),
        completedJobsCount: ((j['completedJobsCount'] as num?) ?? 0).toInt(),
        thisMonthCount: ((j['thisMonthCount'] as num?) ?? 0).toInt(),
        monthlySeries: ((j['monthlySeries'] as List?) ?? const [])
            .map((e) => MonthlyPoint.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        topCategories: ((j['topCategories'] as List?) ?? const [])
            .map((e) => CategoryEarning.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        averageJobValue: ((j['averageJobValue'] as num?) ?? 0).toDouble(),
      );
}

class EarningsRepository {
  final AuthRepository _auth;
  final Dio _dio;
  EarningsRepository(this._auth)
      : _dio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 8),
        ));

  Future<EarningsData> getEarnings(int months) async {
    final t = await _auth.getToken();
    final res = await _dio.get(
      '/users/me/earnings',
      queryParameters: {'months': months},
      options: Options(headers: {'Authorization': 'Bearer $t'}),
    );
    return EarningsData.fromJson(Map<String, dynamic>.from(res.data as Map));
  }
}

final earningsRepositoryProvider = Provider((ref) {
  return EarningsRepository(ref.watch(authRepositoryProvider));
});

final earningsProvider =
    FutureProvider.autoDispose.family<EarningsData, int>((ref, months) async {
  return ref.watch(earningsRepositoryProvider).getEarnings(months);
});
