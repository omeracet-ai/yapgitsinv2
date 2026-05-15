import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/firebase_token_repository.dart';

class TokenScreen extends ConsumerStatefulWidget {
  const TokenScreen({super.key});

  @override
  ConsumerState<TokenScreen> createState() => _TokenScreenState();
}

class _TokenScreenState extends ConsumerState<TokenScreen> {
  String _paymentMethod = 'bank';
  int _selectedAmount = 50;
  bool _loading = false;
  bool _pdfLoading = false;
  DateTimeRange? _pdfRange;

  Future<void> _downloadPdf() async {
    setState(() => _pdfLoading = true);
    try {
      final path = await ref
          .read(tokenRepositoryProvider)
          .downloadHistoryPdf(from: _pdfRange?.start, to: _pdfRange?.end);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('PDF indirildi'),
          backgroundColor: AppColors.success,
          action: SnackBarAction(
            label: 'Paylaş',
            textColor: Colors.white,
            onPressed: () {
              SharePlus.instance.share(
                ShareParams(
                  files: [XFile(path)],
                  text: 'Yapgitsin cüzdan geçmişi',
                ),
              );
            },
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('PDF indirilemedi: ${e.toString()}'),
          backgroundColor: AppColors.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _pdfLoading = false);
    }
  }

  Future<void> _pickPdfRange() async {
    final now = DateTime.now();
    final r = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 3),
      lastDate: now,
      initialDateRange: _pdfRange,
    );
    if (r != null) setState(() => _pdfRange = r);
  }

  final List<int> _presets = [10, 25, 50, 100, 250, 500];

  Future<void> _purchase() async {
    setState(() => _loading = true);
    try {
      await ref.read(tokenRepositoryProvider).purchase(_selectedAmount, _paymentMethod);
      ref.invalidate(tokenBalanceProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('$_selectedAmount token başarıyla yüklendi!'),
          backgroundColor: AppColors.success,
        ));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final balanceAsync = ref.watch(tokenBalanceProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Token Yükle'),
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
                    data: (b) => Text('$b Token',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.bold)),
                    loading: () => const CircularProgressIndicator(color: Colors.white),
                    error: (_, __) => const Text('--',
                        style: TextStyle(color: Colors.white, fontSize: 32)),
                  ),
                  const SizedBox(height: 4),
                  balanceAsync.when(
                    data: (b) => Text('≈ $b ₺',
                        style: const TextStyle(color: Colors.white54, fontSize: 13)),
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
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
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pdfLoading ? null : _downloadPdf,
                    icon: _pdfLoading
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.picture_as_pdf, size: 18),
                    label: const Text('PDF İndir'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'Tarih aralığı',
                  onPressed: _pdfLoading ? null : _pickPdfRange,
                  icon: Icon(
                    Icons.date_range,
                    color: _pdfRange == null
                        ? AppColors.textHint
                        : AppColors.primary,
                  ),
                ),
              ],
            ),
            if (_pdfRange != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '${_pdfRange!.start.toIso8601String().substring(0, 10)} → ${_pdfRange!.end.toIso8601String().substring(0, 10)}',
                  style: const TextStyle(fontSize: 11, color: AppColors.textHint),
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
                      '1 Token = 1 ₺  •  Teklif başına 5 Token',
                      style: TextStyle(fontSize: 13, color: Colors.amber),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text('Miktar Seç',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _presets.map((amt) {
                final isSelected = _selectedAmount == amt;
                return GestureDetector(
                  onTap: () => setState(() => _selectedAmount = amt),
                  child: Container(
                    width: (MediaQuery.of(context).size.width - 60) / 3,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primary : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: isSelected ? AppColors.primary : AppColors.border),
                    ),
                    child: Column(
                      children: [
                        Text('$amt',
                            style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? Colors.white : AppColors.textPrimary)),
                        Text('Token',
                            style: TextStyle(
                                fontSize: 11,
                                color: isSelected ? Colors.white70 : AppColors.textHint)),
                        Text('$amt ₺',
                            style: TextStyle(
                                fontSize: 12,
                                color: isSelected ? Colors.white70 : AppColors.primary)),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 28),

            const Text('Ödeme Yöntemi',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _PaymentOption(
              icon: Icons.account_balance,
              title: 'Banka Transferi',
              subtitle: 'EFT / Havale — Türk Lirası',
              value: 'bank',
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
            ),
            const SizedBox(height: 10),
            _PaymentOption(
              icon: Icons.currency_bitcoin,
              title: 'Kripto Para',
              subtitle: 'BTC / ETH / USDT',
              value: 'crypto',
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
            ),
            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _purchase,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _loading
                    ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                    : Text(
                        '$_selectedAmount Token Satın Al ($_selectedAmount ₺)',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16),
                      ),
              ),
            ),
            const SizedBox(height: 12),
            const Center(
              child: Text(
                'Ödeme simüle edilmektedir. Gerçek ödeme entegrasyonu için iletişime geçin.',
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

class _PaymentOption extends StatelessWidget {
  final IconData icon;
  final String title, subtitle, value, groupValue;
  final ValueChanged<String?> onChanged;

  const _PaymentOption({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.groupValue,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = value == groupValue;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryLight : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
              width: isSelected ? 2 : 1),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary
                      : AppColors.border.withValues(alpha: 0.3),
                  shape: BoxShape.circle),
              child: Icon(icon,
                  color: isSelected ? Colors.white : AppColors.textHint,
                  size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isSelected
                              ? AppColors.primary
                              : AppColors.textPrimary)),
                  Text(subtitle,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textHint)),
                ],
              ),
            ),
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              color: isSelected ? AppColors.primary : AppColors.textHint,
            ),
          ],
        ),
      ),
    );
  }
}
