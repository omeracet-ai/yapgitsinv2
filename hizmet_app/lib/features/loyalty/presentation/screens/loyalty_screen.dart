import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/firebase_loyalty_repository.dart';

class LoyaltyScreen extends ConsumerStatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  ConsumerState<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends ConsumerState<LoyaltyScreen> {
  final _codeController = TextEditingController();
  bool _redeeming = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Color _tierColor(String tier) {
    switch (tier) {
      case 'Platinum':
        return const Color(0xFF7E57C2);
      case 'Gold':
        return const Color(0xFFFFB300);
      case 'Silver':
        return const Color(0xFF90A4AE);
      default:
        return const Color(0xFFB87333); // Bronze
    }
  }

  IconData _tierIcon(String tier) {
    switch (tier) {
      case 'Platinum':
        return Icons.workspace_premium_rounded;
      case 'Gold':
        return Icons.emoji_events_rounded;
      case 'Silver':
        return Icons.military_tech_rounded;
      default:
        return Icons.star_rounded;
    }
  }

  Future<void> _redeem() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;
    setState(() => _redeeming = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final result =
          await ref.read(loyaltyRepositoryProvider).redeem(code);
      final bonus = (result['bonusTokens'] as num?)?.toInt() ?? 0;
      messenger.showSnackBar(SnackBar(
          content: Text('🎁 +$bonus token hesabınıza eklendi'),
          backgroundColor: AppColors.success));
      _codeController.clear();
      ref.invalidate(loyaltyProvider);
    } catch (e) {
      String msg = e.toString();
      if (e.toString().contains('DioException')) {
        msg = 'Kod geçersiz veya zaten kullanılmış';
      }
      messenger.showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppColors.error));
    } finally {
      if (mounted) setState(() => _redeeming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loyaltyAsync = ref.watch(loyaltyProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sadakat & Davet'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: loyaltyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (info) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(loyaltyProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildTierCard(info),
              const SizedBox(height: 16),
              _buildReferralCard(info),
              const SizedBox(height: 16),
              _buildRedeemCard(),
              const SizedBox(height: 24),
              _buildTierLadder(info),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTierCard(LoyaltyInfo info) {
    final color = _tierColor(info.tier);
    final progress = (info.nextTier != null && info.jobsToNextTier != null)
        ? (info.totalSuccess /
                (info.totalSuccess + info.jobsToNextTier!).clamp(1, 999))
            .clamp(0.0, 1.0)
        : 1.0;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, color.withValues(alpha: 0.7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(_tierIcon(info.tier), color: Colors.white, size: 36),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Mevcut Seviye',
                      style: TextStyle(color: Colors.white70, fontSize: 13)),
                  Text(info.tier,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text('${info.totalSuccess} başarılı iş tamamlandı',
              style: const TextStyle(color: Colors.white, fontSize: 14)),
          if (info.nextTier != null && info.jobsToNextTier != null) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: Colors.white24,
                valueColor:
                    const AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            const SizedBox(height: 8),
            Text(
                '${info.nextTier} seviyesine ${info.jobsToNextTier} iş kaldı',
                style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ] else ...[
            const SizedBox(height: 8),
            const Text('🏆 En yüksek seviyedesiniz!',
                style: TextStyle(color: Colors.white, fontSize: 13)),
          ]
        ],
      ),
    );
  }

  Widget _buildReferralCard(LoyaltyInfo info) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.card_giftcard_rounded, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Davet Kodun',
                style:
                    TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ]),
          const SizedBox(height: 8),
          const Text(
              'Arkadaşların kodunu kullandığında ikiniz de 50 token kazanırsınız.',
              style: TextStyle(fontSize: 13, color: Colors.black54)),
          const SizedBox(height: 14),
          Row(children: [
            Expanded(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.4)),
                ),
                child: Text(
                  info.referralCode,
                  style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 3,
                      color: AppColors.primary),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.copy_rounded),
              tooltip: 'Kopyala',
              onPressed: () {
                Clipboard.setData(ClipboardData(text: info.referralCode));
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Kod kopyalandı')));
              },
            ),
            IconButton(
              icon: const Icon(Icons.share_rounded),
              tooltip: 'Paylaş',
              onPressed: () {
                SharePlus.instance.share(
                  ShareParams(
                    text:
                        'Yapgitsin\'e davet kodum: ${info.referralCode}\nKodu kullan, 50 token kazan!',
                    subject: 'Yapgitsin Davet Kodu',
                  ),
                );
              },
            ),
          ]),
        ],
      ),
    );
  }

  Widget _buildRedeemCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.redeem_rounded, color: AppColors.accent),
            SizedBox(width: 8),
            Text('Davet Kodu Kullan',
                style:
                    TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ]),
          const SizedBox(height: 8),
          const Text('Bir arkadaşının kodunu girip 50 token kazan.',
              style: TextStyle(fontSize: 13, color: Colors.black54)),
          const SizedBox(height: 14),
          TextField(
            controller: _codeController,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              hintText: 'Örn. AB12CD34',
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10)),
              prefixIcon: const Icon(Icons.confirmation_num_outlined),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _redeeming ? null : _redeem,
              icon: _redeeming
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check_circle_outline),
              label: Text(_redeeming ? 'Kontrol ediliyor...' : 'Kodu Kullan'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTierLadder(LoyaltyInfo info) {
    final tiers = [
      ('Bronze', 0, const Color(0xFFB87333)),
      ('Silver', 5, const Color(0xFF90A4AE)),
      ('Gold', 15, const Color(0xFFFFB300)),
      ('Platinum', 30, const Color(0xFF7E57C2)),
    ];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Seviyeler',
              style:
                  TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          ...tiers.map((t) {
            final isCurrent = t.$1 == info.tier;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                      color: t.$3, shape: BoxShape.circle),
                  child:
                      const Icon(Icons.star, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t.$1,
                          style: TextStyle(
                              fontWeight: isCurrent
                                  ? FontWeight.bold
                                  : FontWeight.w500,
                              fontSize: 15)),
                      Text('${t.$2}+ tamamlanmış iş',
                          style: const TextStyle(
                              color: Colors.black54, fontSize: 12)),
                    ],
                  ),
                ),
                if (isCurrent)
                  const Icon(Icons.check_circle,
                      color: AppColors.success),
              ]),
            );
          }),
        ],
      ),
    );
  }
}
