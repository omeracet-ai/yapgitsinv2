import 'package:flutter/material.dart';
import '../../../../../core/theme/app_colors.dart';

/// Phase 129 Step 2 — Bio / hizmet açıklaması (min 50 char).
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
          const Text('📝 Kendinden bahset',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text(
              'Müşteriler seni daha iyi tanısın. Tecrübe, uzmanlık ve hizmet alanlarını anlat (min 50 karakter).',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: 20),
          TextField(
            controller: controller,
            maxLines: 8,
            maxLength: 500,
            onChanged: (_) => onChanged(),
            decoration: InputDecoration(
              hintText:
                  'Örn: 10 yıllık tesisat ustasıyım. Su tesisatı, kombi montajı ve banyo tadilatında uzmanım…',
              filled: true,
              fillColor: Colors.white,
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
                ok ? 'Yeterli ($len/500)' : 'Devam etmek için en az 50 karakter ($len/50)',
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
