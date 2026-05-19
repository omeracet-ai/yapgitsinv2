import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/withdrawal_repository.dart';
import '../../data/withdrawal_request.dart';

class WithdrawalScreen extends ConsumerStatefulWidget {
  const WithdrawalScreen({super.key});

  @override
  ConsumerState<WithdrawalScreen> createState() => _WithdrawalScreenState();
}

class _WithdrawalScreenState extends ConsumerState<WithdrawalScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _ibanCtrl = TextEditingController(text: 'TR');
  final _nameCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _ibanCtrl.dispose();
    _nameCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  String _fmtTL(int minor) => '${(minor / 100).toStringAsFixed(2)} TL';

  Future<void> _submit(int availableMinor) async {
    if (!_formKey.currentState!.validate()) return;
    final amountTl = double.tryParse(_amountCtrl.text.replaceAll(',', '.'));
    if (amountTl == null) return;
    final amountMinor = (amountTl * 100).round();
    if (amountMinor > availableMinor) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Yetersiz bakiye. Mevcut: ${_fmtTL(availableMinor)}')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(withdrawalRepositoryProvider).requestWithdrawal(
            amountMinor: amountMinor,
            iban: _ibanCtrl.text.trim().toUpperCase(),
            accountHolderName: _nameCtrl.text.trim(),
            workerNote: _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
          );
      ref.invalidate(withdrawalBalanceProvider);
      ref.invalidate(withdrawalHistoryProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Çekme talebi oluşturuldu')),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Hata: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final balanceAsync = ref.watch(withdrawalBalanceProvider);
    final historyAsync = ref.watch(withdrawalHistoryProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Para Çek')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(withdrawalBalanceProvider);
          ref.invalidate(withdrawalHistoryProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: balanceAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Text('Bakiye yüklenemedi: $e'),
                  data: (minor) => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Çekilebilir Bakiye',
                          style: TextStyle(fontSize: 13, color: Colors.grey)),
                      const SizedBox(height: 6),
                      Text(_fmtTL(minor),
                          style: const TextStyle(
                              fontSize: 26, fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _amountCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Çekilecek Tutar (TL)',
                      hintText: 'Min 50 TL',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                    ],
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Tutar girin';
                      final n = double.tryParse(v.replaceAll(',', '.'));
                      if (n == null) return 'Geçersiz tutar';
                      if (n < 50) return 'Min 50 TL';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _ibanCtrl,
                    decoration: const InputDecoration(
                      labelText: 'IBAN',
                      hintText: 'TR + 24 hane',
                      border: OutlineInputBorder(),
                    ),
                    textCapitalization: TextCapitalization.characters,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')),
                      LengthLimitingTextInputFormatter(26),
                    ],
                    validator: (v) {
                      final s = (v ?? '').trim().toUpperCase();
                      if (!RegExp(r'^TR\d{24}$').hasMatch(s)) {
                        return 'IBAN: TR + 24 hane olmalı';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Hesap Sahibi Adı',
                      border: OutlineInputBorder(),
                    ),
                    textCapitalization: TextCapitalization.words,
                    validator: (v) {
                      if (v == null || v.trim().length < 3) return 'En az 3 karakter';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _noteCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Not (opsiyonel)',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 2,
                    maxLength: 500,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _submitting
                        ? null
                        : () {
                            final minor = balanceAsync.maybeWhen(
                              data: (m) => m,
                              orElse: () => 0,
                            );
                            _submit(minor);
                          },
                    child: Text(_submitting ? 'Gönderiliyor...' : 'Talep Oluştur'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Geçmiş Talepler',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            historyAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Hata: $e'),
              data: (items) {
                if (items.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Henüz çekme talebi yok',
                        style: TextStyle(color: Colors.grey)),
                  );
                }
                return Column(children: items.map(_historyRow).toList());
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _historyRow(WithdrawalRequestModel w) {
    final (label, color) = _statusBadge(w.status);
    return Card(
      child: ListTile(
        title: Text('${(w.amountMinor / 100).toStringAsFixed(2)} TL'),
        subtitle: Text(
          '${w.requestedAt.toLocal().toString().substring(0, 16)} • ${w.iban}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(label,
              style: TextStyle(
                  color: color, fontSize: 12, fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }

  (String, Color) _statusBadge(WithdrawalStatus s) {
    switch (s) {
      case WithdrawalStatus.pending:
        return ('Beklemede', Colors.orange);
      case WithdrawalStatus.approved:
        return ('Onaylandı', Colors.blue);
      case WithdrawalStatus.rejected:
        return ('Reddedildi', Colors.red);
      case WithdrawalStatus.completed:
        return ('Tamamlandı', Colors.green);
    }
  }
}
