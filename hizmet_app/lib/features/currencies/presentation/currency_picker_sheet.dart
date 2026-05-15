import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/firebase_currency_repository.dart';

/// Bottom sheet — para birimi seçici.
/// Açılışta /currencies'i çeker, seçim yapılınca PATCH /users/me/currency.
class CurrencyPickerSheet extends ConsumerWidget {
  const CurrencyPickerSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const CurrencyPickerSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(currenciesProvider);
    final selected = ref.watch(preferredCurrencyProvider);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Para Birimi',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            async.when(
              data: (list) => Column(
                children: list.map((c) {
                  final isSel = c.code == selected;
                  return ListTile(
                    leading: Text(c.symbol,
                        style: const TextStyle(fontSize: 22)),
                    title: Text('${c.code} — ${c.name}'),
                    trailing: isSel
                        ? const Icon(Icons.check_circle, color: Colors.blue)
                        : null,
                    onTap: () async {
                      try {
                        await ref
                            .read(currencyRepositoryProvider)
                            .setPreferredCurrency(c.code);
                        ref.read(preferredCurrencyProvider.notifier).state =
                            c.code;
                        if (context.mounted) Navigator.pop(context);
                      } catch (_) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Güncellenemedi')),
                          );
                        }
                      }
                    },
                  );
                }).toList(),
              ),
              loading: () => const Padding(
                padding: EdgeInsets.all(20),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(20),
                child: Text('Hata: $e'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
