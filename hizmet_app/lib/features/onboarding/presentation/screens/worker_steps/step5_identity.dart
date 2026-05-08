import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../../core/theme/app_colors.dart';

/// Phase 129 Step 5 — Kimlik fotoğrafı (zorunlu).
class WorkerOnboardingStep5Identity extends StatelessWidget {
  final File? identityPhoto;
  final ValueChanged<File?> onChanged;
  const WorkerOnboardingStep5Identity({
    super.key,
    required this.identityPhoto,
    required this.onChanged,
  });

  Future<void> _pick() async {
    final p = await ImagePicker().pickImage(
        source: ImageSource.gallery, imageQuality: 80, maxWidth: 1280);
    if (p != null) onChanged(File(p.path));
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('🪪 Kimlik doğrulama',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text(
              'Güvenli marketplace için kimlik fotoğrafı zorunlu. Şifreli saklanır.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: _pick,
            child: Container(
              height: 220,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: identityPhoto != null
                      ? AppColors.primary
                      : Colors.orange.shade300,
                  width: 1.5,
                ),
              ),
              child: identityPhoto != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: Image.file(identityPhoto!,
                          fit: BoxFit.cover, width: double.infinity),
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.badge_outlined,
                            size: 56, color: Colors.orange.shade400),
                        const SizedBox(height: 12),
                        const Text('Kimlik fotoğrafı yükle',
                            style: TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 15)),
                        const SizedBox(height: 4),
                        Text('Galeriden seç',
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey.shade600)),
                      ],
                    ),
            ),
          ),
          if (identityPhoto != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: TextButton.icon(
                onPressed: _pick,
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Yeniden Seç'),
              ),
            ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Row(children: [
              Icon(Icons.verified_user_outlined,
                  color: AppColors.primary, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Admin onayından sonra mavi tik kazanırsın — daha fazla teklif alırsın.',
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
