import 'package:flutter/material.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../data/confirmation_state.dart';

/// Phase 254 — Üst bar: her tarafın hangi adımda olduğunu gösterir.
class ConfirmationProgress extends StatelessWidget {
  final ConfirmationState state;
  final String? mySide; // worker | customer

  const ConfirmationProgress({
    super.key,
    required this.state,
    required this.mySide,
  });

  @override
  Widget build(BuildContext context) {
    final tier = state.tier;
    final req = state.requirements.photosPerPhase;
    final isLite = tier == ConfirmationTier.lite;

    String workerLabel = '';
    String customerLabel = '';

    // QR step
    final qrDone = state.qrScanned;
    workerLabel += qrDone ? '✅' : '⏳';
    customerLabel += qrDone ? '✅' : '⏳';

    // Photo step (standard+)
    if (!isLite && req > 0) {
      workerLabel += ' ${state.photosCompleteFor("worker") ? "✅" : "❌"}';
      customerLabel += ' ${state.photosCompleteFor("customer") ? "✅" : "❌"}';
    }

    // Confirm step
    workerLabel += ' ${state.workerConfirmed ? "✅" : "⏳"}';
    customerLabel += ' ${state.customerConfirmed ? "✅" : "⏳"}';

    final tierLabel = switch (tier) {
      ConfirmationTier.lite => 'Lite (< ₺500)',
      ConfirmationTier.standard => 'Standard',
      ConfirmationTier.premium => 'Premium',
      _ => tier,
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  tierLabel,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const Spacer(),
              if (state.deadline != null)
                Text(
                  _deadlineText(state.deadline!),
                  style: TextStyle(
                      fontSize: 11, color: AppColors.textSecondary),
                ),
            ],
          ),
          const SizedBox(height: 10),
          _row('Usta', workerLabel, highlight: mySide == 'worker'),
          const SizedBox(height: 4),
          _row('Müşteri', customerLabel, highlight: mySide == 'customer'),
        ],
      ),
    );
  }

  static String _deadlineText(DateTime d) {
    final remaining = d.difference(DateTime.now());
    if (remaining.isNegative) return 'Süre doldu';
    final h = remaining.inHours;
    if (h >= 24) return 'Süre: ${(h / 24).floor()} gün';
    return 'Süre: ${h}sa';
  }

  Widget _row(String label, String marks, {bool highlight = false}) {
    return Row(
      children: [
        SizedBox(
          width: 70,
          child: Text(
            label,
            style: TextStyle(
              fontWeight: highlight ? FontWeight.w700 : FontWeight.w500,
              color:
                  highlight ? AppColors.primary : AppColors.textPrimary,
              fontSize: 13,
            ),
          ),
        ),
        Text(marks, style: const TextStyle(fontSize: 14)),
      ],
    );
  }
}
