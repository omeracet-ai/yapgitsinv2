import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/firebase_promo_repository.dart';

class PromoScreen extends ConsumerStatefulWidget {
  const PromoScreen({super.key});

  @override
  ConsumerState<PromoScreen> createState() => _PromoScreenState();
}

class _PromoScreenState extends ConsumerState<PromoScreen> {
  final _ctrl = TextEditingController();
  bool _validating = false;
  bool _applying = false;
  PromoValidateResult? _validated;
  String? _error;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _validate() async {
    final code = _ctrl.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _validating = true;
      _error = null;
      _validated = null;
    });
    try {
      final result = await ref.read(promoRepositoryProvider).validate(code);
      if (!mounted) return;
      if (result.valid) {
        setState(() => _validated = result);
      } else {
        setState(() => _error = 'Geçersiz veya süresi dolmuş kod');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _validating = false);
    }
  }

  Future<void> _apply() async {
    final code = _ctrl.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _applying = true;
      _error = null;
    });
    try {
      final result = await ref.read(promoRepositoryProvider).apply(code);
      if (!mounted) return;
      final tokens = result.tokensAdded;
      final msg = tokens != null
          ? 'Promo uygulandı! $tokens token eklendi'
          : 'Promo kodu uygulandı';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        backgroundColor: AppColors.success,
      ));
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _applying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Promo Kodu'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 8),
            const Icon(Icons.confirmation_number_outlined,
                size: 56, color: AppColors.primary),
            const SizedBox(height: 16),
            const Text(
              'Promosyon Kodun Var mı?',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Kodunu gir, doğrula; ardından uygula.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 28),
            TextField(
              controller: _ctrl,
              textCapitalization: TextCapitalization.characters,
              onChanged: (_) {
                if (_validated != null || _error != null) {
                  setState(() {
                    _validated = null;
                    _error = null;
                  });
                }
              },
              decoration: InputDecoration(
                hintText: 'Örn: HOSGELDIN100',
                prefixIcon: const Icon(Icons.local_offer_outlined),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(
                _error!,
                style: const TextStyle(color: AppColors.error, fontSize: 13),
              ),
            ],
            if (_validated != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.success),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.check_circle,
                          color: AppColors.success, size: 18),
                      const SizedBox(width: 6),
                      Text(
                        _validated!.type == 'percent'
                            ? '%${_validated!.discount} indirim'
                            : '${_validated!.discount}₺ indirim',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.success),
                      ),
                    ]),
                    if (_validated!.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(_validated!.description,
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary)),
                    ],
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
            SizedBox(
              height: 48,
              child: OutlinedButton(
                onPressed: _validating ? null : _validate,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _validating
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Doğrula',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: (_validated == null || _applying) ? null : _apply,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: _applying
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Uygula',
                        style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
