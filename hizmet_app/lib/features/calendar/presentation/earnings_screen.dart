import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/widgets/list_skeleton.dart';
import '../../wallet/data/payment_repository.dart';

class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final earningsAsync = ref.watch(earningsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kazançlarım', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: earningsAsync.when(
        data: (data) {
          final lastTx = data['lastTransactions'] as List;

          return RefreshIndicator(
            onRefresh: () => ref.refresh(earningsProvider.future),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildSummaryCard(
                  context,
                  title: 'Toplam Kazanç',
                  amount: '${data['totalEarnings']} TL',
                  color: Colors.blue,
                  icon: Icons.account_balance_wallet,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildMiniStat(
                        'Bu Ay',
                        '${data['monthlyEarnings']} TL',
                        Colors.green,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildMiniStat(
                        'Bu Hafta',
                        '${data['weeklyEarnings']} TL',
                        Colors.orange,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Text(
                  'Son İşlemler',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                if (lastTx.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Text('Henüz tamamlanmış bir işlem yok.', style: TextStyle(color: Colors.grey)),
                    ),
                  )
                else
                  ...lastTx.map((tx) => _buildTransactionItem(tx)),
              ],
            ),
          );
        },
        loading: () => ListSkeleton(itemCount: 5, itemBuilder: (_) => const NotificationSkeleton()),
        error: (e, st) => Center(child: Text('Hata oluştu: $e')),
      ),
    );
  }

  Widget _buildSummaryCard(BuildContext context, {required String title, required String amount, required Color color, required IconData icon}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [color, color.withValues(alpha: 0.8)]),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 5))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white, size: 30),
          const SizedBox(height: 20),
          Text(title, style: const TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 4),
          Text(amount, style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String title, String amount, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(amount, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(Map<String, dynamic> tx) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: const CircleAvatar(
          backgroundColor: Colors.greenAccent,
          child: Icon(Icons.add, color: Colors.green),
        ),
        title: Text(tx['category'] ?? 'Hizmet Ödemesi', style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(tx['date'].toString().split('T')[0]),
        trailing: Text(
          '+${tx['amount']} TL',
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 16),
        ),
      ),
    );
  }
}
