import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../../core/theme/app_colors.dart';

/// Phase 129 Step 3 â€” Saat Ã¼creti (opsiyonel).
class WorkerOnboardingStep3Rate extends StatelessWidget {
  final TextEditingController minCtrl;
  final TextEditingController maxCtrl;
  const WorkerOnboardingStep3Rate({
    super.key,
    required this.minCtrl,
    required this.maxCtrl,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('ğŸ’° Saatlik Ã¼cret aralÄ±ÄŸÄ±n',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text(
              'Opsiyonel â€” istersen ÅŸimdi atla, profil ayarlarÄ±ndan sonra dÃ¼zenle.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: minCtrl,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: InputDecoration(
                    labelText: 'Min (â‚º/saat)',
                    prefixIcon: const Icon(Icons.south_outlined),
                    
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: maxCtrl,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: InputDecoration(
                    labelText: 'Max (â‚º/saat)',
                    prefixIcon: const Icon(Icons.north_outlined),
                    
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Row(children: [
              Icon(Icons.lightbulb_outline,
                  color: AppColors.primary, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Piyasa ortalamasÄ±: 150â€“500 â‚º/saat. TecrÃ¼beli ustalar daha yÃ¼ksek belirleyebilir.',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}
