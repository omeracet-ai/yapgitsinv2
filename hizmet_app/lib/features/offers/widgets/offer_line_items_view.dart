import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Read-only display of offer line items.
class OfferLineItemsView extends StatelessWidget {
  final List<Map<String, dynamic>>? items;

  const OfferLineItemsView({super.key, required this.items});

  double _num(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse('${v ?? ''}'.replaceAll(',', '.')) ?? 0;
  }

  @override
  Widget build(BuildContext context) {
    final list = items;
    if (list == null || list.isEmpty) return const SizedBox.shrink();

    final total = list.fold<double>(0.0, (sum, m) {
      final t = m['total'];
      if (t != null) return sum + _num(t);
      return sum + (_num(m['qty']) * _num(m['unitPrice']));
    });

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ...list.map((m) {
            final label = (m['label'] ?? '').toString();
            final qty = _num(m['qty']);
            final unit = _num(m['unitPrice']);
            final t = m['total'] != null ? _num(m['total']) : qty * unit;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      label.isEmpty ? '—' : label,
                      style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    '${qty.toStringAsFixed(qty.truncateToDouble() == qty ? 0 : 2)} × ₺${unit.toStringAsFixed(2)}',
                    style: const TextStyle(fontSize: 11, color: AppColors.textPrimary),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '₺${t.toStringAsFixed(2)}',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
            );
          }),
          const Divider(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Toplam',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              Text('₺${total.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13)),
            ],
          ),
        ],
      ),
    );
  }
}
