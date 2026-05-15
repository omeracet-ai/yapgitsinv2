// Firebase migration
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/firestore_service.dart';

final firebaseEarningsRepositoryProvider =
    Provider((_) => FirebaseEarningsRepository());

class MonthlyPoint {
  final String month;
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
}

class FirebaseEarningsRepository {
  final _fs = FirestoreService.instance;

  Future<EarningsData> getEarnings() async {
    final uid = _fs.uid;
    if (uid == null) return _empty();

    final payments = await _fs.query(
      _fs.col('payments')
          .where('workerId', isEqualTo: uid)
          .where('status', isEqualTo: 'completed'),
    );

    final now = DateTime.now();
    final thisMonth = '${now.year}-${now.month.toString().padLeft(2, '0')}';
    final lastMonthDate = DateTime(now.year, now.month - 1);
    final lastMonth = '${lastMonthDate.year}-${lastMonthDate.month.toString().padLeft(2, '0')}';

    double total = 0, thisMonthE = 0, lastMonthE = 0;
    int totalCount = 0, thisMonthCount = 0;
    final Map<String, Map<String, dynamic>> monthly = {};
    final Map<String, Map<String, dynamic>> categories = {};

    for (final p in payments) {
      final amount = ((p['amount'] as num?) ?? 0).toDouble();
      final cat = (p['category'] as String?) ?? 'Diğer';
      final ts = (p['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now();
      final month = '${ts.year}-${ts.month.toString().padLeft(2, '0')}';

      total += amount;
      totalCount++;

      if (month == thisMonth) { thisMonthE += amount; thisMonthCount++; }
      if (month == lastMonth) lastMonthE += amount;

      monthly[month] = {
        'month': month,
        'earnings': ((monthly[month]?['earnings'] as num?) ?? 0) + amount,
        'count': ((monthly[month]?['count'] as num?) ?? 0) + 1,
      };

      categories[cat] = {
        'category': cat,
        'earnings': ((categories[cat]?['earnings'] as num?) ?? 0) + amount,
        'count': ((categories[cat]?['count'] as num?) ?? 0) + 1,
      };
    }

    final growth = lastMonthE > 0
        ? ((thisMonthE - lastMonthE) / lastMonthE * 100)
        : 0.0;

    return EarningsData(
      totalEarnings: total,
      thisMonthEarnings: thisMonthE,
      lastMonthEarnings: lastMonthE,
      growthPercent: growth,
      completedJobsCount: totalCount,
      thisMonthCount: thisMonthCount,
      monthlySeries: monthly.values
          .map(MonthlyPoint.fromJson)
          .toList()
        ..sort((a, b) => a.month.compareTo(b.month)),
      topCategories: categories.values
          .map(CategoryEarning.fromJson)
          .toList()
        ..sort((a, b) => b.earnings.compareTo(a.earnings)),
      averageJobValue: totalCount > 0 ? total / totalCount : 0,
    );
  }

  EarningsData _empty() => EarningsData(
        totalEarnings: 0, thisMonthEarnings: 0, lastMonthEarnings: 0,
        growthPercent: 0, completedJobsCount: 0, thisMonthCount: 0,
        monthlySeries: [], topCategories: [], averageJobValue: 0,
      );
}
