import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/crypto_deposit_repository.dart';

/// USDT-TRC20 ile Kredi yükleme — borsadan hesap cüzdanına gönderim + admin onayı.
/// [purpose] 'token' (jeton satın alma) | 'wallet' (cüzdan kredisi).
class UsdtDepositScreen extends ConsumerStatefulWidget {
  final String purpose;
  const UsdtDepositScreen({super.key, this.purpose = 'token'});

  @override
  ConsumerState<UsdtDepositScreen> createState() => _UsdtDepositScreenState();
}

class _UsdtDepositScreenState extends ConsumerState<UsdtDepositScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _txIdCtrl = TextEditingController();
  final _creditCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _txIdCtrl.dispose();
    _creditCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await ref.read(cryptoDepositRepositoryProvider).create(
            amountUsdt: double.parse(_amountCtrl.text.replaceAll(',', '.')),
            txId: _txIdCtrl.text.trim(),
            creditAmount: int.parse(_creditCtrl.text.trim()),
            purpose: widget.purpose,
          );
      if (!mounted) return;
      _amountCtrl.clear();
      _txIdCtrl.clear();
      _creditCtrl.clear();
      ref.invalidate(myCryptoDepositsProvider);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text(
            'Talebiniz alındı. Admin onayından sonra Kredi yüklenecek.'),
        backgroundColor: AppColors.success,
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.toString().replaceFirst('Exception: ', '')),
        backgroundColor: AppColors.error,
      ));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Geçmiş bir kayıttan formu doldur (işlem tekrarı).
  void _repeat(Map<String, dynamic> d) {
    setState(() {
      _amountCtrl.text = '${d['amountUsdt'] ?? ''}';
      _creditCtrl.text = '${d['creditAmount'] ?? ''}';
      _txIdCtrl.clear(); // yeni TxID gerekli — mükerrer engellenir
    });
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Tutarlar dolduruldu — yeni işlem hash (TxID) girin.'),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final addressAsync = ref.watch(cryptoDepositAddressProvider);
    final historyAsync = ref.watch(myCryptoDepositsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('USDT ile Kredi Yükle')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ── Adres kartı ──
          addressAsync.when(
            loading: () => const Center(
                child: Padding(
                    padding: EdgeInsets.all(24),
                    child: CircularProgressIndicator())),
            error: (e, _) => Text('Adres alınamadı: $e',
                style: const TextStyle(color: AppColors.error)),
            data: (w) => _addressCard(w),
          ),
          const SizedBox(height: 20),

          // ── Form ──
          Text('Gönderim Bilgileri',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _amountCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText: 'Gönderilen USDT tutarı',
                    hintText: 'örn. 50',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    final n = double.tryParse((v ?? '').replaceAll(',', '.'));
                    if (n == null || n <= 0) return 'Geçerli tutar girin';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _creditCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Yüklenecek Kredi miktarı',
                    hintText: 'örn. 500',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    final n = int.tryParse((v ?? '').trim());
                    if (n == null || n < 1) return 'Geçerli Kredi miktarı girin';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _txIdCtrl,
                  decoration: const InputDecoration(
                    labelText: 'İşlem Hash (TxID)',
                    hintText: 'Borsadaki gönderim işlem numarası',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if ((v ?? '').trim().length < 10) {
                      return 'Geçerli bir TxID girin';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Talebi Gönder'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── Geçmiş ──
          Text('Yatırım Geçmişi',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          historyAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('$e',
                style: const TextStyle(color: AppColors.error)),
            data: (list) => list.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Text('Henüz yatırım yok.',
                        style: TextStyle(color: AppColors.textSecondary)))
                : Column(children: list.map(_historyTile).toList()),
          ),
        ],
      ),
    );
  }

  Widget _addressCard(Map<String, dynamic> w) {
    final address = (w['address'] ?? '').toString();
    final network = (w['network'] ?? 'TRC20').toString();
    final asset = (w['asset'] ?? 'USDT').toString();
    final note = (w['note'] ?? '').toString();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Text('$asset • $network ağı',
              style: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          if (address.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: QrImageView(
                data: address,
                version: QrVersions.auto,
                size: 180,
                backgroundColor: Colors.white,
              ),
            ),
          const SizedBox(height: 12),
          SelectableText(address,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: address));
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Adres kopyalandı'),
                duration: Duration(seconds: 1),
              ));
            },
            icon: const Icon(Icons.copy, size: 16),
            label: const Text('Adresi Kopyala'),
          ),
          if (note.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded,
                      color: AppColors.warning, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(note,
                        style: TextStyle(
                            fontSize: 12, color: AppColors.textPrimary)),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _historyTile(Map<String, dynamic> d) {
    final status = (d['status'] ?? 'pending').toString();
    final amount = d['amountUsdt'];
    final credit = d['creditAmount'];
    final (Color c, String label) = switch (status) {
      'approved' => (AppColors.success, 'Onaylandı'),
      'rejected' => (AppColors.error, 'Reddedildi'),
      _ => (AppColors.warning, 'Onay Bekliyor'),
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
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
                Text('$amount USDT → $credit Kredi',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                if ((d['adminNote'] ?? '').toString().isNotEmpty)
                  Text(d['adminNote'].toString(),
                      style: TextStyle(
                          fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: c.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(label,
                style: TextStyle(
                    color: c, fontSize: 11, fontWeight: FontWeight.bold)),
          ),
          if (status == 'rejected') ...[
            const SizedBox(width: 4),
            IconButton(
              tooltip: 'Tekrar dene',
              icon: const Icon(Icons.refresh, size: 18),
              onPressed: () => _repeat(d),
            ),
          ],
        ],
      ),
    );
  }
}
