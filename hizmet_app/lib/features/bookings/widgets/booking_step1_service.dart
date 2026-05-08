import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class BookingStep1Service extends StatelessWidget {
  final List<String> categories;
  final String? selectedCategory;
  final String subCategory;
  final String description;
  final ValueChanged<String?> onCategoryChanged;
  final ValueChanged<String> onSubCategoryChanged;
  final ValueChanged<String> onDescriptionChanged;

  const BookingStep1Service({
    super.key,
    required this.categories,
    required this.selectedCategory,
    required this.subCategory,
    required this.description,
    required this.onCategoryChanged,
    required this.onSubCategoryChanged,
    required this.onDescriptionChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Hizmet Seçimi',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text('Hangi hizmet için randevu almak istiyorsunuz?',
              style: TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 20),
          const Text('Kategori', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (categories.isEmpty)
            const Text('Bu usta için kategori bulunamadı.',
                style: TextStyle(color: AppColors.error))
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: categories.map((c) {
                final selected = c == selectedCategory;
                return ChoiceChip(
                  label: Text(c),
                  selected: selected,
                  onSelected: (_) => onCategoryChanged(c),
                  selectedColor: AppColors.primaryLight,
                  labelStyle: TextStyle(
                    color: selected ? AppColors.primary : AppColors.textPrimary,
                    fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                  ),
                );
              }).toList(),
            ),
          const SizedBox(height: 20),
          const Text('Alt Hizmet (opsiyonel)',
              style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: subCategory,
            decoration: const InputDecoration(
              hintText: 'Örn: Salon temizliği',
              border: OutlineInputBorder(),
            ),
            onChanged: onSubCategoryChanged,
          ),
          const SizedBox(height: 20),
          const Text('Açıklama *', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: description,
            minLines: 4,
            maxLines: 8,
            decoration: const InputDecoration(
              hintText: 'Yapılacak işi kısaca anlatın…',
              border: OutlineInputBorder(),
            ),
            onChanged: onDescriptionChanged,
          ),
        ],
      ),
    );
  }
}
