import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../data/firebase_token_repository.dart';

class GiftTokensSheet extends ConsumerStatefulWidget {
  final String recipientId;
  final String recipientName;
  const GiftTokensSheet({
    super.key,
    required this.recipientId,
    required this.recipientName,
  });

  static Future<void> show(
    BuildContext context, {
    required String recipientId,
    required String recipientName,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => GiftTokensSheet(
        recipientId: recipientId,
        recipientName: recipientName,
      ),
    );
  }

  @override
  ConsumerState<GiftTokensSheet> createState() => _GiftTokensSheetState();
}

class _GiftTokensSheetState extends ConsumerState<GiftTokensSheet> {
  final _amountCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final amount = int.tryParse(_amountCtrl.text.trim()) ?? 0;
    if (amount < 1 || amount > 1000) {
      setState(() => _error = 'Miktar 1 ile 1000 arasında olmalı');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      final res = await ref.read(tokenRepositoryProvider).giftTokens(
            recipientId: widget.recipientId,
            amount: amount,
            note: _noteCtrl.text.trim(),
          );
      ref.invalidate(tokenBalanceProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.success,
          content: Text(
            '${res['amount']} token ${res['recipientName']} kullanıcısına gönderildi',
          ),
        ),
      );
    } on DioException catch (e) {
      final msg = e.response?.data is Map
          ? (e.response!.data['message']?.toString() ?? 'Hata')
          : 'Bağlantı hatası';
      setState(() {
        _sending = false;
        _error = msg;
      });
    } catch (e) {
      setState(() {
        _sending = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final balanceAsync = ref.watch(tokenBalanceProvider);
    final inset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: inset),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Text('🎁', style: TextStyle(fontSize: 24)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${widget.recipientName} kullanıcısına token hediye et',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            balanceAsync.when(
              data: (b) => Text('Mevcut bakiyen: $b token',
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textSecondary)),
              loading: () => const Text('Bakiye yükleniyor...',
                  style:
                      TextStyle(fontSize: 13, color: AppColors.textSecondary)),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: 'Miktar (1-1000)',
                prefixIcon: const Icon(Icons.toll_rounded),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteCtrl,
              maxLength: 200,
              maxLines: 2,
              decoration: InputDecoration(
                labelText: 'Not (opsiyonel)',
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 4),
              Text(_error!,
                  style:
                      const TextStyle(color: AppColors.error, fontSize: 13)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _sending ? null : _send,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                icon: _sending
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send_rounded),
                label: Text(_sending ? 'Gönderiliyor...' : 'Gönder'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
