import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/escrow_repository.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/list_skeleton.dart';

final _myEscrowsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.watch(escrowRepositoryProvider).listMy();
});

class EscrowListScreen extends ConsumerWidget {
  const EscrowListScreen({super.key});

  Color _statusColor(String status) {
    switch (status) {
      case EscrowStatus.held:
        return AppColors.warning;
      case EscrowStatus.released:
        return AppColors.success;
      case EscrowStatus.refunded:
      case EscrowStatus.cancelled:
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  Color _statusBg(String status) {
    switch (status) {
      case EscrowStatus.held:
        return const Color(0xFFFFF4E0);
      case EscrowStatus.released:
        return const Color(0xFFE3F8EE);
      case EscrowStatus.refunded:
      case EscrowStatus.cancelled:
        return const Color(0xFFFCE9E9);
      default:
        return AppColors.border;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case EscrowStatus.held:
        return 'Beklemede';
      case EscrowStatus.released:
        return 'Serbest Bırakıldı';
      case EscrowStatus.refunded:
        return 'İade Edildi';
      case EscrowStatus.cancelled:
        return 'İptal';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_myEscrowsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Escrow İşlemlerim'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      backgroundColor: AppColors.background,
      body: async.when(
        loading: () => ListSkeleton(itemCount: 5, itemBuilder: (_) => const NotificationSkeleton()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Text(
              'Hata: $e',
              style: const TextStyle(color: AppColors.error),
              textAlign: TextAlign.center,
            ),
          ),
        ),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  'Henüz escrow işleminiz yok.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 15),
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final item = list[i];
              final status = item['status']?.toString() ?? '';
              final amount =
                  (item['amount'] as num?)?.toDouble() ?? 0.0;
              final jobTitle =
                  item['jobTitle']?.toString() ?? item['jobId']?.toString() ?? '—';
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            jobTitle,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${amount.toStringAsFixed(2)} ₺',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: _statusBg(status),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _statusLabel(status),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _statusColor(status),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
