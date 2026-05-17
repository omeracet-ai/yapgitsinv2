import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/api_constants.dart';

class PublicStats {
  final int totalUsers;
  final int totalJobs;
  final int totalWorkers;
  const PublicStats({
    required this.totalUsers,
    required this.totalJobs,
    required this.totalWorkers,
  });
}

/// Public read-only counters used by marketing surfaces (onboarding badge etc.).
/// 1dk auto-refresh; backend already caches 1dk so we don't hammer it.
final publicStatsProvider = FutureProvider<PublicStats>((ref) async {
  final dio = Dio(BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 5),
  ));
  final res = await dio.get<Map<String, dynamic>>('/stats/public');
  final d = res.data ?? const {};
  return PublicStats(
    totalUsers: (d['totalUsers'] as num?)?.toInt() ?? 0,
    totalJobs: (d['totalJobs'] as num?)?.toInt() ?? 0,
    totalWorkers: (d['totalWorkers'] as num?)?.toInt() ?? 0,
  );
});
