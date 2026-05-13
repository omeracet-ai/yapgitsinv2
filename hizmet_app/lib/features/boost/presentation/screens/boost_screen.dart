import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../tokens/data/token_repository.dart';
import '../../data/boost_repository.dart';

class BoostScreen extends ConsumerWidget {
  const BoostScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pkgsAsync = ref.watch(boostPackagesProvider);
    final myAsync = ref.watch(myBoostsProvider);
    final balanceAsync = ref.watch(tokenBalanceProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Hızlı Boost'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(boostPackagesProvider);
          ref.invalidate(myBoostsProvider);
          ref.invalidate(tokenBalanceProvider);
          await Future<void>.delayed(const Duration(milliseconds: 300));
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            balanceAsync.when(
              data: (b) => _balanceBanner(b),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 12),
            myAsync.when(
              data: (m) {
                final active = m['active'] ?? [];
                if (active.isEmpty) return const SizedBox.shrink();
                return Column(
                  children: [
                    for (final b in active) _activeBoostBanner(b),
                    const SizedBox(height: 8),
                  ],
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'Boost Paketleri',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            pkgsAsync.when(
              data: (pkgs) => Column(
                children: [
                  for (final p in pkgs)
                    _packageCard(context, ref, p, balanceAsync.value ?? 0),
                ],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Paketler yüklenemedi: $e'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _balanceBanner(int balance) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(children: [
        const Icon(Icons.toll_rounded, color: AppColors.primary),
        const SizedBox(width: 10),
        Text('Bakiye: $balance Token',
            style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.primaryDark)),
      ]),
    );
  }

  Widget _activeBoostBanner(Map<String, dynamic> b) {
    final type = (b['type'] ?? '').toString();
    final expiresStr = (b['expiresAt'] ?? '').toString();
    String left = '';
    try {
      final exp = DateTime.parse(expiresStr).toLocal();
      final diff = exp.difference(DateTime.now());
      if (diff.inHours >= 24) {
        left = '${diff.inDays} gün sonra biter';
      } else if (diff.inHours > 0) {
        left = '${diff.inHours} saat sonra biter';
      } else if (diff.inMinutes > 0) {
        left = '${diff.inMinutes} dk sonra biter';
      } else {
        left = 'Az sonra biter';
      }
    } catch (e, st) {
      debugPrint('boost_screen._buildActiveCard.parseExpires: $e\n$st');
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
            colors: [AppColors.accent, Color(0xFFFFB800)]),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(children: [
        const Text('🚀', style: TextStyle(fontSize: 22)),
        const SizedBox(width: 10),
        Expanded(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              Text('Aktif: ${_typeLabel(type)}',
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold)),
              Text(left,
                  style: const TextStyle(color: Colors.white70, fontSize: 12)),
            ])),
      ]),
    );
  }

  String _typeLabel(String type) {
    switch (type) {
      case 'featured_24h':
        return 'Öne Çıkan 24 Saat';
      case 'featured_7d':
        return 'Öne Çıkan 7 Gün';
      case 'top_search_24h':
        return 'Aramada İlk 3 — 24 Saat';
      default:
        return type;
    }
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'featured_24h':
        return Icons.flash_on_rounded;
      case 'featured_7d':
        return Icons.star_rounded;
      case 'top_search_24h':
        return Icons.trending_up_rounded;
      default:
        return Icons.rocket_launch_rounded;
    }
  }

  Widget _packageCard(BuildContext context, WidgetRef ref,
      Map<String, dynamic> p, int balance) {
    final type = (p['type'] ?? '').toString();
    final cost = (p['tokenCost'] as num?)?.toInt() ?? 0;
    final hours = (p['durationHours'] as num?)?.toInt() ?? 0;
    final name = (p['name'] ?? '').toString();
    final desc = (p['description'] ?? '').toString();
    final canAfford = balance >= cost;

    final durationLabel =
        hours >= 24 ? '${(hours / 24).round()} gün' : '$hours saat';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(_iconFor(type), color: AppColors.primary, size: 28),
            const SizedBox(width: 10),
            Expanded(
                child: Text(name,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text('$cost Token',
                  style: const TextStyle(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.bold)),
            ),
          ]),
          const SizedBox(height: 8),
          Text(desc,
              style:
                  const TextStyle(color: Colors.black54, fontSize: 13, height: 1.3)),
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.timer_outlined, size: 16, color: Colors.black45),
            const SizedBox(width: 4),
            Text('Süre: $durationLabel',
                style: const TextStyle(color: Colors.black54, fontSize: 12)),
          ]),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: canAfford ? () => _confirmPurchase(context, ref, p) : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: Text(canAfford ? 'Satın Al' : 'Yetersiz Bakiye'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmPurchase(
      BuildContext context, WidgetRef ref, Map<String, dynamic> p) async {
    final cost = (p['tokenCost'] as num?)?.toInt() ?? 0;
    final name = (p['name'] ?? '').toString();
    final type = (p['type'] ?? '').toString();
    final messenger = ScaffoldMessenger.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Boost Onayı'),
        content: Text('$name paketi için $cost token harcanacak. Onaylıyor musunuz?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('İptal')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Onayla')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(boostRepositoryProvider).purchase(type);
      ref.invalidate(myBoostsProvider);
      ref.invalidate(tokenBalanceProvider);
      messenger.showSnackBar(
          const SnackBar(content: Text('Boost aktif edildi 🚀')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Hata: $e')));
    }
  }
}
