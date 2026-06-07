// Phase 439b — OEM Battery Whitelist Onboarding Sheet
//
// Shown once on first push permission grant for users on aggressive-killer
// OEMs (Xiaomi/Huawei/Oppo/Vivo/OnePlus/Realme).

import 'package:flutter/material.dart';

import '../services/oem_onboarding_service.dart';

class OemBatterySheet extends StatelessWidget {
  final String manufacturer;
  const OemBatterySheet({super.key, required this.manufacturer});

  static Future<void> showIfNeeded(BuildContext context) async {
    if (!await OemOnboardingService.shouldPrompt()) return;
    await OemOnboardingService.markShown();
    if (!context.mounted) return;
    final m = await OemOnboardingService.manufacturerLabel();
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (_) => OemBatterySheet(manufacturer: m),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20, 4, 20, 20 + MediaQuery.of(context).padding.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              alignment: Alignment.center,
              child: const Text('🔔', style: TextStyle(fontSize: 22)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Bildirimleri kaçırma',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ]),
          const SizedBox(height: 12),
          Text(
            '$manufacturer telefonların pil tasarrufu, uygulamayı arka planda '
            'kapatabiliyor. Bildirim geç gelir ya da hiç gelmez.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Bildirimleri zamanında almak için pil optimizasyonundan istisna tanıyın.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.7),
            ),
          ),
          const SizedBox(height: 18),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Daha sonra'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: FilledButton(
                onPressed: () async {
                  final granted =
                      await OemOnboardingService.requestBatteryWhitelist();
                  if (context.mounted) {
                    Navigator.of(context).pop();
                    if (granted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                              '✅ Bildirimler artık güvenilir şekilde gelecek'),
                        ),
                      );
                    }
                  }
                },
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Pil ayarına git'),
              ),
            ),
          ]),
        ],
      ),
    );
  }
}
