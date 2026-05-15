import 'package:flutter/material.dart';
import '../../../../../core/theme/app_colors.dart';

/// Phase 129 Step 4 â€” Åehir/ilÃ§e + servis radius slider.
class WorkerOnboardingStep4Location extends StatelessWidget {
  final TextEditingController cityCtrl;
  final TextEditingController districtCtrl;
  final int radiusKm;
  final ValueChanged<int> onRadiusChanged;
  const WorkerOnboardingStep4Location({
    super.key,
    required this.cityCtrl,
    required this.districtCtrl,
    required this.radiusKm,
    required this.onRadiusChanged,
  });

  static const _options = [5, 10, 20, 50];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('ğŸ“ Hizmet bÃ¶lgen',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text('MÃ¼ÅŸteriler seni bu bÃ¶lgede bulacak.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: 20),
          TextField(
            controller: cityCtrl,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: 'Åehir',
              prefixIcon: const Icon(Icons.location_city_outlined),
              
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: districtCtrl,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: 'Ä°lÃ§e',
              prefixIcon: const Icon(Icons.map_outlined),
              
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 24),
          const Text('Servis YarÄ±Ã§apÄ±',
              style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: _options.map((km) {
              final sel = km == radiusKm;
              return ChoiceChip(
                label: Text('$km km'),
                selected: sel,
                onSelected: (_) => onRadiusChanged(km),
                selectedColor: AppColors.primaryLight,
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          Text('SeÃ§ili: $radiusKm km â€” bu mesafeye kadar iÅŸ tekliflerini alÄ±rsÄ±n.',
              style: const TextStyle(
                  fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}
