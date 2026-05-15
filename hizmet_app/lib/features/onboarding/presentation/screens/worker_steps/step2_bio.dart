import 'package:flutter/material.dart';
import '../../../../../core/theme/app_colors.dart';

/// Phase 129 Step 2 â€” Bio / hizmet aÃ§Ä±klamasÄ± (min 50 char).
class WorkerOnboardingStep2Bio extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onChanged;
  const WorkerOnboardingStep2Bio({
    super.key,
    required this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final len = controller.text.trim().length;
    final ok = len >= 50;
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('ğŸ“ Kendinden bahset',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text(
              'MÃ¼ÅŸteriler seni daha iyi tanÄ±sÄ±n. TecrÃ¼be, uzmanlÄ±k ve hizmet alanlarÄ±nÄ± anlat (min 50 karakter).',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: 20),
          TextField(
            controller: controller,
            maxLines: 8,
            maxLength: 500,
            onChanged: (_) => onChanged(),
            decoration: InputDecoration(
              hintText:
                  'Ã–rn: 10 yÄ±llÄ±k tesisat ustasÄ±yÄ±m. Su tesisatÄ±, kombi montajÄ± ve banyo tadilatÄ±nda uzmanÄ±mâ€¦',
              
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          Row(
            children: [
              Icon(ok ? Icons.check_circle : Icons.info_outline,
                  size: 16,
                  color: ok ? AppColors.success : AppColors.textHint),
              const SizedBox(width: 6),
              Text(
                ok ? 'Yeterli ($len/500)' : 'Devam etmek iÃ§in en az 50 karakter ($len/50)',
                style: TextStyle(
                  fontSize: 12,
                  color: ok ? AppColors.success : AppColors.textHint,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
