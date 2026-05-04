import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'iyzico_payment_screen.dart';

class WalletScreen extends StatelessWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Cüzdanım'),
        backgroundColor: AppColors.primary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildBalanceCard(),
            const SizedBox(height: 24),
            _buildQuickActions(context),
            const SizedBox(height: 24),
            _buildTransactionsHeader(),
            const SizedBox(height: 12),
            _buildTransactionList(),
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryDark]),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha:0.3), blurRadius: 15, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          const Text('Kullanılabilir Bakiye', style: TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 8),
          const Text('1.450,00 ₺', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildBalanceDetail('Bekleyen', '250 ₺'),
              Container(width: 1, height: 30, color: Colors.white24),
              _buildBalanceDetail('Toplam Kazanç', '8.700 ₺'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceDetail(String label, String value) {
    return Column(children: [Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)), Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))]);
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      children: [
        _buildActionButton(Icons.add_card, 'Para Yükle', Colors.blue, () => _showAddMoneyDialog(context)),
        const SizedBox(width: 16),
        _buildActionButton(Icons.account_balance_wallet_outlined, 'Para Çek', Colors.orange, () {}),
      ],
    );
  }

  void _showAddMoneyDialog(BuildContext context) {
    final controller = TextEditingController(text: '100');
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Bakiye Yükle'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(suffixText: '₺', labelText: 'Miktar'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('İptal')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final success = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => IyzicoPaymentScreen(amount: double.parse(controller.text)),
                ),
              );
              if (!context.mounted) return;
              if (success == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Ödeme başarılı! Bakiyeniz güncellendi.'), backgroundColor: Colors.green),
                );
              }
            },
            child: const Text('Ödeme Yap'),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(IconData icon, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
          child: Column(children: [Icon(icon, color: color), const SizedBox(height: 8), Text(label, style: const TextStyle(fontWeight: FontWeight.w600))]),
        ),
      ),
    );
  }

  Widget _buildTransactionsHeader() {
    return const Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Son İşlemler', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text('Tümü', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildTransactionList() {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 4,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
          child: Row(
            children: [
              CircleAvatar(backgroundColor: index % 2 == 0 ? Colors.green.withValues(alpha:0.1) : Colors.red.withValues(alpha:0.1), child: Icon(index % 2 == 0 ? Icons.add : Icons.remove, color: index % 2 == 0 ? Colors.green : Colors.red)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Boya & Badana İşi', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(index % 2 == 0 ? 'Ödeme Alındı' : 'Para Çekme', style: const TextStyle(fontSize: 12, color: AppColors.textHint)),
                  ],
                ),
              ),
              Text(index % 2 == 0 ? '+500 ₺' : '-200 ₺', style: TextStyle(color: index % 2 == 0 ? Colors.green : Colors.red, fontWeight: FontWeight.bold)),
            ],
          ),
        );
      },
    );
  }
}
