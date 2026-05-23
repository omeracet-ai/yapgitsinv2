import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/intl_formatter.dart';
import '../../data/payment_repository.dart';

/// Phase 253-R — Müşteri iade talep ekranı.
///
/// Route: `/iade-talep/:paymentId` (extra: { amountMinor, paymentDate, workerName }).
/// Tam veya kısmi iade talebi gönderir → POST /payments/refund.
class RefundRequestScreen extends ConsumerStatefulWidget {
  final String paymentId;
  final int amountMinor;
  final DateTime? paymentDate;
  final String? workerName;

  const RefundRequestScreen({
    super.key,
    required this.paymentId,
    required this.amountMinor,
    this.paymentDate,
    this.workerName,
  });

  @override
  ConsumerState<RefundRequestScreen> createState() =>
      _RefundRequestScreenState();
}

class _RefundRequestScreenState extends ConsumerState<RefundRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  bool _isPartial = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _amountCtrl.text = (widget.amountMinor / 100).toStringAsFixed(2);
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      int? amountMinor;
      if (_isPartial) {
        final entered = double.tryParse(_amountCtrl.text.replaceAll(',', '.'));
        if (entered != null) {
          amountMinor = (entered * 100).round();
        }
      }
      await ref.read(paymentRepositoryProvider).requestRefund(
            paymentId: widget.paymentId,
            amountMinor: amountMinor,
            reason: _reasonCtrl.text.trim(),
          );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Talep Alındı'),
          content: const Text(
            'İade talebin alındı. 1-3 iş günü içinde kartına yansıyacak.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Tamam'),
            ),
          ],
        ),
      );
      if (!mounted) return;
      context.pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('İade talebi başarısız: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fullAmount = widget.amountMinor / 100;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('İade Talep Et'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildPaymentInfoCard(context, fullAmount),
              const SizedBox(height: 20),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Kısmi iade istiyorum',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: const Text(
                  'Kapalı: tam iade alınacak.',
                  style: TextStyle(fontSize: 12),
                ),
                value: _isPartial,
                onChanged: _submitting
                    ? null
                    : (v) => setState(() => _isPartial = v),
              ),
              if (_isPartial) ...[
                const SizedBox(height: 8),
                TextFormField(
                  controller: _amountCtrl,
                  enabled: !_submitting,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                  ],
                  decoration: const InputDecoration(
                    labelText: 'İade Tutarı (₺)',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.attach_money),
                  ),
                  validator: (v) {
                    if (!_isPartial) return null;
                    if (v == null || v.trim().isEmpty) {
                      return 'Tutar gerekli';
                    }
                    final n = double.tryParse(v.replaceAll(',', '.'));
                    if (n == null || n <= 0) return 'Geçersiz tutar';
                    if (n > fullAmount) {
                      return 'En fazla ${fullAmount.toStringAsFixed(2)} ₺';
                    }
                    return null;
                  },
                ),
              ],
              const SizedBox(height: 20),
              TextFormField(
                controller: _reasonCtrl,
                enabled: !_submitting,
                minLines: 4,
                maxLines: 8,
                maxLength: 500,
                decoration: const InputDecoration(
                  labelText: 'İade Sebebi',
                  hintText: 'Lütfen iade sebebini açıklayın (en az 10 karakter).',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                validator: (v) {
                  final t = v?.trim() ?? '';
                  if (t.length < 10) return 'En az 10 karakter yazın';
                  if (t.length > 500) return 'En fazla 500 karakter';
                  return null;
                },
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _submitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'İade Talebi Gönder',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Talebin onaylanırsa tutar 1-3 iş günü içinde kartına iade edilir.',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentInfoCard(BuildContext context, double fullAmount) {
    final dateStr = widget.paymentDate != null
        ? IntlFormatter.date(context, widget.paymentDate!)
        : '—';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Ödeme Bilgisi',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 10),
          _row('Tutar', '${fullAmount.toStringAsFixed(2)} ₺'),
          const SizedBox(height: 6),
          _row('Tarih', dateStr),
          if (widget.workerName != null && widget.workerName!.isNotEmpty) ...[
            const SizedBox(height: 6),
            _row('Usta', widget.workerName!),
          ],
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
