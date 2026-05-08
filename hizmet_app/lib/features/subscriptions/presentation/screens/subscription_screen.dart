import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/subscription_repository.dart';

class SubscriptionScreen extends ConsumerWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plansAsync = ref.watch(subscriptionPlansProvider);
    final myAsync = ref.watch(mySubscriptionProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Premium Üyelik'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(subscriptionPlansProvider);
          ref.invalidate(mySubscriptionProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            myAsync.when(
              data: (sub) => sub == null
                  ? const _NoActiveBanner()
                  : _ActiveSubscriptionCard(sub: sub, onCancel: () => _cancel(context, ref)),
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(),
                ),
              ),
              error: (e, _) => Text('Hata: $e'),
            ),
            const SizedBox(height: 16),
            const Text(
              'Planlar',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            plansAsync.when(
              data: (plans) {
                final mySub = myAsync.value;
                return Column(
                  children: plans
                      .map((p) => _PlanCard(
                            plan: p,
                            isCurrent: mySub?.plan.key == p.key && mySub!.isActive,
                            onSubscribe: () => _subscribe(context, ref, p.key),
                          ))
                      .toList(),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Hata: $e'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _subscribe(BuildContext context, WidgetRef ref, String planKey) async {
    try {
      final url = await ref.read(subscriptionRepositoryProvider).subscribe(planKey);
      if (!context.mounted) return;
      ref.invalidate(mySubscriptionProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Abonelik başlatıldı. Ödeme: $url'),
          backgroundColor: AppColors.success,
        ),
      );
      // TODO: paymentUrl gerçek iyzipay olduğunda IyzicoPaymentScreen ile WebView aç
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Hata: $e'), backgroundColor: AppColors.error),
      );
    }
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Aboneliği iptal et?'),
        content: const Text('Mevcut dönem sonuna kadar Pro avantajları devam eder.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Vazgeç')),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('İptal Et', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(subscriptionRepositoryProvider).cancel();
      ref.invalidate(mySubscriptionProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Abonelik iptal edildi')),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Hata: $e'), backgroundColor: AppColors.error),
      );
    }
  }
}

class _NoActiveBanner extends StatelessWidget {
  const _NoActiveBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Row(
        children: [
          Icon(Icons.info_outline, color: AppColors.primary),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Aktif aboneliğiniz yok. Pro/Premium ile sınırsız teklif verin.',
              style: TextStyle(color: AppColors.primary),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActiveSubscriptionCard extends StatelessWidget {
  final UserSubscription sub;
  final VoidCallback onCancel;
  const _ActiveSubscriptionCard({required this.sub, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('dd MMM yyyy');
    return Card(
      color: AppColors.success.withValues(alpha: 0.08),
      shape: RoundedRectangleBorder(
        side: const BorderSide(color: AppColors.success, width: 1.5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.verified, color: AppColors.success),
                const SizedBox(width: 8),
                Text(
                  '✓ ${sub.plan.name}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (sub.expiresAt != null)
              Text('Bitiş: ${df.format(sub.expiresAt!)}'),
            const SizedBox(height: 12),
            TextButton(
              onPressed: onCancel,
              child: const Text(
                'Aboneliği İptal Et',
                style: TextStyle(color: Colors.red),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final SubscriptionPlan plan;
  final bool isCurrent;
  final VoidCallback onSubscribe;

  const _PlanCard({
    required this.plan,
    required this.isCurrent,
    required this.onSubscribe,
  });

  @override
  Widget build(BuildContext context) {
    final isPremium = plan.key.contains('premium');
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isPremium ? AppColors.accent : AppColors.primary,
          width: isPremium ? 2 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                isPremium ? '⭐' : '💎',
                style: const TextStyle(fontSize: 22),
              ),
              const SizedBox(width: 8),
              Text(
                plan.name,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              Text(
                '${plan.price.toInt()} ₺',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: isPremium ? AppColors.accent : AppColors.primary,
                ),
              ),
              const Text(' /ay', style: TextStyle(color: Colors.grey)),
            ],
          ),
          const SizedBox(height: 12),
          ...plan.features.map(
            (f) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: AppColors.success, size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text(f)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: isCurrent ? null : onSubscribe,
              style: ElevatedButton.styleFrom(
                backgroundColor: isPremium ? AppColors.accent : AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(
                isCurrent ? 'Mevcut Plan' : 'Abone Ol',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
