import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../categories/data/category_repository.dart';

/// Phase 129 Step 1 — Multi-select kategori chip'leri.
class WorkerOnboardingStep1Categories extends ConsumerWidget {
  final List<String> selected;
  final ValueChanged<List<String>> onChanged;
  const WorkerOnboardingStep1Categories({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(categoriesProvider);
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('🛠️ Hangi hizmetleri veriyorsun?',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text('En az 1 kategori seç. İstediğin kadar ekleyebilirsin.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
          const SizedBox(height: 20),
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Hata: $e'),
              data: (cats) => SingleChildScrollView(
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: cats.map((c) {
                    final name = c['name']?.toString() ?? '';
                    final icon = c['icon']?.toString() ?? '🔧';
                    final isSel = selected.contains(name);
                    return FilterChip(
                      avatar: Text(icon),
                      label: Text(name),
                      selected: isSel,
                      onSelected: (v) {
                        final next = List<String>.from(selected);
                        if (v) {
                          if (!next.contains(name)) next.add(name);
                        } else {
                          next.remove(name);
                        }
                        onChanged(next);
                      },
                      selectedColor: AppColors.primaryLight,
                      checkmarkColor: AppColors.primary,
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
          if (selected.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('${selected.length} kategori seçildi',
                  style: const TextStyle(
                      color: AppColors.primary, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }
}
