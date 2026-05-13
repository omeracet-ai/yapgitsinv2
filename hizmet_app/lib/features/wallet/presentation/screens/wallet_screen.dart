import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../../tokens/data/token_repository.dart';

final _walletHistoryProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.watch(tokenRepositoryProvider).getHistory();
});

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balanceAsync = ref.watch(tokenBalanceProvider);
    final historyAsync = ref.watch(_walletHistoryProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Cüzdanım'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(tokenBalanceProvider);
              ref.invalidate(_walletHistoryProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(tokenBalanceProvider);
          ref.invalidate(_walletHistoryProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              _buildBalanceCard(context, balanceAsync),
              const SizedBox(height: 24),
              _buildQuickActions(context, ref),
              const SizedBox(height: 24),
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Son İşlemler',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 12),
              _buildTransactionList(historyAsync),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBalanceCard(
      BuildContext context, AsyncValue<int> balanceAsync) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.primaryDark]),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.3),
              blurRadius: 15,
              offset: const Offset(0, 8))
        ],
      ),
      child: Column(
        children: [
          const Text('Token Bakiyesi',
              style: TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 8),
          balanceAsync.when(
            data: (b) => Text('$b Token',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 36,
                    fontWeight: FontWeight.bold)),
            loading: () => const CircularProgressIndicator(color: Colors.white),
            error: (_, __) => const Text('--',
                style: TextStyle(color: Colors.white, fontSize: 36)),
          ),
          const SizedBox(height: 8),
          const Text('Her teklif 5 token harcar',
              style: TextStyle(color: Colors.white54, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context, WidgetRef ref) {
    return Row(
      children: [
        Expanded(
          child: _ActionButton(
            icon: Icons.add_card,
            label: 'Token Yükle',
            color: Colors.blue,
            onTap: () => context.push('/jetonlar'),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _ActionButton(
            icon: Icons.history_rounded,
            label: 'Geçmiş',
            color: Colors.orange,
            onTap: () {
              ref.invalidate(_walletHistoryProvider);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTransactionList(
      AsyncValue<List<Map<String, dynamic>>> historyAsync) {
    return historyAsync.when(
      loading: () =>
          const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(Icons.wifi_off_outlined,
                  size: 40, color: AppColors.textHint),
              const SizedBox(height: 8),
              Text('İşlem geçmişi yüklenemedi: $e',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary)),
            ],
          ),
        ),
      ),
      data: (txList) {
        if (txList.isEmpty) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 32),
            child: Column(
              children: [
                Icon(Icons.receipt_long_outlined,
                    size: 48, color: AppColors.textHint),
                SizedBox(height: 12),
                Text('Henüz işlem yok.',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 14)),
              ],
            ),
          );
        }
        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: txList.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (_, i) => _TxCard(tx: txList[i]),
        );
      },
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(children: [
          Icon(icon, color: color),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}

class _TxCard extends StatelessWidget {
  final Map<String, dynamic> tx;
  const _TxCard({required this.tx});

  @override
  Widget build(BuildContext context) {
    final type = tx['type'] as String? ?? 'spend';
    final amount = (tx['amount'] as num?)?.toInt() ?? 0;
    final status = tx['status'] as String? ?? 'completed';
    final createdAt = tx['createdAt'] as String? ?? '';

    final isCredit = type == 'purchase' || type == 'refund';
    final (label, icon, color) = switch (type) {
      'purchase' => ('Token Yükleme', Icons.add_circle_outline, Colors.green),
      'refund' => ('İade', Icons.undo_rounded, Colors.teal),
      _ => ('Teklif Ücreti', Icons.remove_circle_outline, Colors.red),
    };

    final (statusLabel, statusColor) = switch (status) {
      'completed' => ('Tamamlandı', Colors.green),
      'pending' => ('Bekliyor', Colors.orange),
      _ => ('Başarısız', Colors.red),
    };

    String dateStr = '';
    if (createdAt.isNotEmpty) {
      final dt = DateTime.tryParse(createdAt)?.toLocal();
      if (dt != null) {
        // P190/4 — locale-aware via IntlFormatter.
        dateStr = IntlFormatter.date(context, dt);
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: color.withValues(alpha: 0.1),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                Row(children: [
                  Text(statusLabel,
                      style: TextStyle(fontSize: 12, color: statusColor)),
                  if (dateStr.isNotEmpty) ...[
                    const Text(' · ',
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textHint)),
                    Text(dateStr,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textHint)),
                  ],
                ]),
              ],
            ),
          ),
          Text(
            isCredit ? '+$amount' : '-$amount',
            style: TextStyle(
                color: isCredit ? Colors.green : Colors.red,
                fontWeight: FontWeight.bold,
                fontSize: 16),
          ),
          const SizedBox(width: 4),
          Text('TKN',
              style: TextStyle(
                  fontSize: 11,
                  color: (isCredit ? Colors.green : Colors.red)
                      .withValues(alpha: 0.7))),
        ],
      ),
    );
  }
}
