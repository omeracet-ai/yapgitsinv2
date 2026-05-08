import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// 3-step wizard progress bar.
///
/// Renders 3 connected segments. Active and past steps use [AppColors.primary],
/// upcoming steps use grey. Above the bar we render the step labels.
class JobWizardProgress extends StatelessWidget {
  final int currentStep; // 0-based
  final List<String> labels;

  const JobWizardProgress({
    super.key,
    required this.currentStep,
    this.labels = const ['Kategori', 'Detaylar', 'Foto & Konum'],
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: List.generate(labels.length, (i) {
              final active = i <= currentStep;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: i == labels.length - 1 ? 0 : 6),
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: active ? AppColors.primary : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          Row(
            children: List.generate(labels.length, (i) {
              final active = i <= currentStep;
              return Expanded(
                child: Text(
                  '${i + 1}. ${labels[i]}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: i == currentStep ? FontWeight.w700 : FontWeight.w500,
                    color: active ? AppColors.primary : Colors.grey.shade500,
                  ),
                  textAlign: i == 0
                      ? TextAlign.start
                      : (i == labels.length - 1 ? TextAlign.end : TextAlign.center),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
