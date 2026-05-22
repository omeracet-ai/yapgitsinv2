import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../escrow/data/escrow_repository.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../../core/theme/app_colors.dart';

/// Phase 253 — Admin-only screen listing all escrow disputes with resolve UI.
class AdminDisputesScreen extends ConsumerWidget {
  const AdminDisputesScreen({super.key});

  bool _isAdmin(WidgetRef ref) {
    final st = ref.read(authStateProvider);
    if (st is! AuthAuthenticated) return false;
    final role = (st.user['role'] ?? '').toString().toLowerCase();
    return role == 'admin';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!_isAdmin(ref)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Uyuşmazlık Yönetimi')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text('Bu sayfaya erişim yetkiniz yok.',
                textAlign: TextAlign.center),
          ),
        ),
      );
    }
    final async = ref.watch(adminDisputedEscrowsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Uyuşmazlık Yönetimi'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(adminDisputedEscrowsProvider),
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
            child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('Hata: $e'))),
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('Açık uyuşmazlık yok.'));
          }
          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(adminDisputedEscrowsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _DisputeCard(escrow: items[i]),
            ),
          );
        },
      ),
    );
  }
}

class _DisputeCard extends ConsumerWidget {
  final Escrow escrow;
  const _DisputeCard({required this.escrow});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade300),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFE4E6),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text('UYUŞMAZLIK',
                      style: TextStyle(
                          color: Color(0xFFC0392B),
                          fontSize: 11,
                          fontWeight: FontWeight.bold)),
                ),
                const Spacer(),
                Text('${escrow.amount.toStringAsFixed(2)} ₺',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 8),
            Text('Escrow #${escrow.id}',
                style: const TextStyle(fontSize: 11, color: Colors.black54)),
            const SizedBox(height: 4),
            Text('Müşteri: ${escrow.customerId}',
                style: const TextStyle(fontSize: 12)),
            Text('Usta: ${escrow.workerId}',
                style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 8),
            const Text('Sebep:',
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.bold)),
            Text(escrow.disputeReason ?? '(belirtilmedi)',
                style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => _showResolveDialog(context, ref, escrow),
                icon: const Icon(Icons.gavel_outlined, size: 18),
                label: const Text('Çöz'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showResolveDialog(
      BuildContext context, WidgetRef ref, Escrow e) async {
    String action = 'release';
    double splitRatio = 0.5;
    final noteCtrl = TextEditingController();

    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSt) => AlertDialog(
            title: const Text('Uyuşmazlığı Çöz'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RadioGroup<String>(
                    groupValue: action,
                    onChanged: (v) => setSt(() => action = v!),
                    child: const Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        RadioListTile<String>(
                          title: Text('Ustaya öde (release)'),
                          value: 'release',
                        ),
                        RadioListTile<String>(
                          title: Text('Müşteriye iade (refund)'),
                          value: 'refund',
                        ),
                        RadioListTile<String>(
                          title: Text('Paylaş (split)'),
                          value: 'split',
                        ),
                      ],
                    ),
                  ),
                  if (action == 'split') ...[
                    const SizedBox(height: 8),
                    Text(
                        'Ustaya: %${(splitRatio * 100).toStringAsFixed(0)} — '
                        'Müşteriye: %${((1 - splitRatio) * 100).toStringAsFixed(0)}'),
                    Slider(
                      value: splitRatio,
                      onChanged: (v) => setSt(() => splitRatio = v),
                    ),
                  ],
                  const SizedBox(height: 8),
                  TextField(
                    controller: noteCtrl,
                    maxLines: 2,
                    maxLength: 500,
                    decoration: const InputDecoration(
                      labelText: 'Admin notu (opsiyonel)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                  onPressed: () => Navigator.of(ctx).pop(false),
                  child: const Text('Vazgeç')),
              ElevatedButton(
                  onPressed: () => Navigator.of(ctx).pop(true),
                  child: const Text('Uygula')),
            ],
          ),
        );
      },
    );
    if (ok != true) return;
    try {
      await ref.read(adminEscrowRepositoryProvider).resolve(
            escrowId: e.id,
            action: action,
            splitRatio: action == 'split' ? splitRatio : null,
            adminNote: noteCtrl.text.trim().isEmpty
                ? null
                : noteCtrl.text.trim(),
          );
      ref.invalidate(adminDisputedEscrowsProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Uyuşmazlık çözüldü'),
        backgroundColor: AppColors.success,
      ));
    } catch (err) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err.toString().replaceFirst('Exception: ', '')),
        backgroundColor: AppColors.error,
      ));
    }
  }
}
