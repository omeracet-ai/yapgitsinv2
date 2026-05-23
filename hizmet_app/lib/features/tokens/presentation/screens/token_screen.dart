import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../crypto_deposits/presentation/screens/usdt_deposit_screen.dart';
import '../../data/token_repository.dart';
import 'token_checkout_screen.dart';

/// Phase 260 — Jeton satın alma ekranı.
///
/// Serbest manuel yükleme (bank/crypto, sahte ödeme) KALDIRILDI. Kullanıcı
/// yalnızca sunucu katalogundan bir paket seçip iyzipay üzerinden öder. Manuel
/// jeton tanımlama yalnızca admin yetkisindedir (admin panel).
class TokenScreen extends ConsumerStatefulWidget {
  const TokenScreen({super.key});

  @override
  ConsumerState<TokenScreen> createState() => _TokenScreenState();
}

class _TokenScreenState extends ConsumerState<TokenScreen> {
  String? _busyPackageId;

  String _priceLabel(num priceMinor) {
    final tl = priceMinor / 100;
    final isWhole = tl == tl.truncateToDouble();
    return isWhole ? '${tl.toInt()} ₺' : '${tl.toStringAsFixed(2)} ₺';
  }

  Future<void> _buy(Map<String, dynamic> pkg) async {
    final packageId = pkg['id'] as String;
    setState(() => _busyPackageId = packageId);
    try {
      final checkout =
          await ref.read(tokenRepositoryProvider).createIyzipayCheckout(packageId);
      final token = checkout['token'] as String?;
      if (token == null || token.isEmpty) {
        throw Exception('Ödeme başlatılamadı');
      }
      if (!mounted) return;
      final ok = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => TokenCheckoutScreen(
            paymentToken: token,
            paymentUrl: checkout['paymentPageUrl'] as String?,
            formContent: checkout['checkoutFormContent'] as String?,
          ),
        ),
      );
      if (!mounted) return;
      if (ok == true) {
        ref.invalidate(tokenBalanceProvider);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${pkg['tokens']} kredi hesabına yüklendi!'),
          backgroundColor: AppColors.success,
        ));
        Navigator.pop(context);
      } else if (ok == false) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Ödeme tamamlanmadı.'),
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _busyPackageId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final balanceAsync = ref.watch(tokenBalanceProvider);
    final packagesAsync = ref.watch(tokenPackagesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Kredi Satın Al'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Mevcut bakiye kartı
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Mevcut Bakiye',
                      style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 8),
                  balanceAsync.when(
                    data: (b) => Text('$b Kredi',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.bold)),
                    loading: () =>
                        const CircularProgressIndicator(color: Colors.white),
                    error: (_, __) => const Text('--',
                        style: TextStyle(color: Colors.white, fontSize: 32)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => context.push('/promo'),
                icon: const Icon(Icons.confirmation_number_outlined, size: 18),
                label: const Text('Promo Kodun Var mı?'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) =>
                        const UsdtDepositScreen(purpose: 'token'),
                  ),
                ),
                icon: const Icon(Icons.currency_bitcoin, size: 18),
                label: const Text('USDT (TRC-20) ile Yükle'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.amber.shade300),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.amber, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '1 Kredi = 1 ₺  •  Teklif başına 5 Kredi',
                      style: TextStyle(fontSize: 13, color: Colors.amber),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text('Paket Seç',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            packagesAsync.when(
              data: (packages) => Column(
                children: packages
                    .map((pkg) => _PackageCard(
                          label: pkg['label'] as String? ?? '',
                          tokens: (pkg['tokens'] as num?)?.toInt() ?? 0,
                          priceLabel:
                              _priceLabel((pkg['priceMinor'] as num?) ?? 0),
                          badge: pkg['badge'] as String?,
                          loading: _busyPackageId == pkg['id'],
                          disabled: _busyPackageId != null,
                          onTap: () => _buy(pkg),
                        ))
                    .toList(),
              ),
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, __) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                  children: [
                    Text('Paketler yüklenemedi: $e',
                        style: const TextStyle(color: AppColors.error)),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () => ref.invalidate(tokenPackagesProvider),
                      child: const Text('Tekrar Dene'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Center(
              child: Text(
                'Ödemeler iyzico güvenli ödeme altyapısı ile alınır.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: AppColors.textHint),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PackageCard extends StatelessWidget {
  final String label;
  final int tokens;
  final String priceLabel;
  final String? badge;
  final bool loading;
  final bool disabled;
  final VoidCallback onTap;

  const _PackageCard({
    required this.label,
    required this.tokens,
    required this.priceLabel,
    required this.badge,
    required this.loading,
    required this.disabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.toll, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('$tokens Kredi',
                        style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary)),
                    if (badge != null && badge!.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.accent.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(badge!,
                            style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.accent)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(priceLabel,
                    style: TextStyle(
                        fontSize: 14, color: AppColors.textSecondary)),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: disabled ? null : onTap,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2),
                  )
                : const Text('Satın Al'),
          ),
        ],
      ),
    );
  }
}
