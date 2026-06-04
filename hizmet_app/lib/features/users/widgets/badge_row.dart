import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/overflow_slide_row.dart';
import 'badge_chip.dart';

/// Renders a list of badges as Wrap chips.
///
/// Accepts the raw `badges` array from API responses (List of maps with
/// `key`, `label`, `icon`). When [compact] is true (e.g. inside list cards),
/// shows max 2 chips followed by a `+N` overflow chip.
class BadgeRow extends StatelessWidget {
  final List<dynamic>? badges;
  final bool compact;

  const BadgeRow({super.key, required this.badges, this.compact = false});

  @override
  Widget build(BuildContext context) {
    final list = badges;
    if (list == null || list.isEmpty) return const SizedBox.shrink();

    // Phase 418 — "Doğrulanmış" rozeti tüm ekranlarda gizle (kullanıcı
    // isteği). Profile/PublicProfile/Provider listede aynı kural; Phase
    // 407'deki ProfileScreen inline filter'ı buraya taşındı, tek kaynak.
    final parsed = <_Badge>[];
    for (final raw in list) {
      if (raw is Map) {
        final label = (raw['label'] ?? '').toString();
        if (label.isEmpty) continue;
        final key = (raw['key'] ?? '').toString().toLowerCase();
        final labelLower = label.toLowerCase();
        if (key == 'verified' || labelLower == 'doğrulanmış') continue;
        parsed.add(_Badge(
          label: label,
          icon: raw['icon']?.toString(),
        ));
      }
    }
    if (parsed.isEmpty) return const SizedBox.shrink();

    if (compact) {
      final visible = parsed.take(2).toList();
      final overflow = parsed.length - visible.length;
      // Phase 429 — compact (list card) modunda zaten max 2 chip + overflow
      // chip var; tek satıra rahat sığar, slide row gerekmez. Sade Wrap kalır.
      return Wrap(
        spacing: 6,
        runSpacing: 4,
        children: [
          ...visible.map((b) =>
              BadgeChip(label: b.label, icon: b.icon, small: true)),
          if (overflow > 0)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '+$overflow',
                style: const TextStyle(
                  fontSize: 10.5,
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      );
    }

    // Phase 429 — full mode: rozetler taşıyor olabilir, yatay slide + oklar.
    return OverflowSlideRow(
      spacing: 8,
      height: 32,
      children: parsed
          .map((b) => BadgeChip(label: b.label, icon: b.icon))
          .toList(),
    );
  }
}

class _Badge {
  final String label;
  final String? icon;
  _Badge({required this.label, this.icon});
}
