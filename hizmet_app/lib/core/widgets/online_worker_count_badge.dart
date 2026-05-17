import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../network/public_stats_provider.dart';
import 'job_status_badge.dart';

/// Toplam kayıtlı usta sayısı rozeti — backend `/stats/public` →
/// totalWorkers (worker kategorisi tanımlanmış tüm kullanıcılar).
/// Yüklenirken placeholder, hata/boş veride hiç render etmez (sahte sayı yok).
class OnlineWorkerCountBadge extends ConsumerWidget {
  const OnlineWorkerCountBadge({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(publicStatsProvider);
    return stats.when(
      loading: () => const OnlineCountBadge(text: 'Ustalar yükleniyor…'),
      error: (_, __) => const SizedBox.shrink(),
      data: (s) {
        if (s.totalWorkers <= 0) return const SizedBox.shrink();
        final formatted = NumberFormat.decimalPattern('tr').format(s.totalWorkers);
        return OnlineCountBadge(text: '$formatted kayıtlı usta');
      },
    );
  }
}
