import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';

class ProfileSettings extends StatelessWidget {
  const ProfileSettings({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Para birimi kaldırıldı, dil seçeneği aktif edildi.
        ListTile(
          leading: const Icon(Icons.language_outlined, color: AppColors.verifiedBlue),
          title: const Text('Dil / Language'),
          trailing: DropdownButton<String>(
            value: 'TR',
            items: const [
              DropdownMenuItem(value: 'TR', child: Text('Türkçe')),
              DropdownMenuItem(value: 'EN', child: Text('English')),
              DropdownMenuItem(value: 'AZ', child: Text('Azərbaycan')),
            ],
            onChanged: (val) {},
          ),
        ),
        // Tema Değiştirici
        ListTile(
          leading: const Icon(Icons.brightness_4_outlined, color: AppColors.primary),
          title: const Text('Tema / Theme'),
          trailing: Switch(
            value: Theme.of(context).brightness == Brightness.dark,
            onChanged: (val) {
              // Theme switching logic here
            },
          ),
        ),
      ],
    );
  }
}
