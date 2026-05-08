import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/category_subscription_repository.dart';

/// Phase 143 — Kategori abonelikleri yönetim ekranı.
class CategorySubscriptionsScreen extends ConsumerWidget {
  const CategorySubscriptionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(categorySubscriptionsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        title: const Text('🔔 Kategori Abonelikleri'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (subs) {
          if (subs.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  'Henüz abonelik yok.\n\nUsta arama ekranından "🔔 Bu Aramaya Abone Ol" ile yeni iş bildirimleri alabilirsin.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 15, color: AppColors.secondary),
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: subs.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final s = subs[i];
              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.primaryLight,
                    child: Icon(Icons.notifications_active,
                        color: AppColors.primary),
                  ),
                  title: Text(s.category,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(s.city == null || s.city!.isEmpty
                      ? 'Tüm şehirler'
                      : '📍 ${s.city}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline,
                        color: AppColors.error),
                    onPressed: () => _confirmDelete(context, ref, s),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _confirmDelete(
      BuildContext context, WidgetRef ref, CategorySubscription s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Aboneliği sil?'),
        content: Text(
            '${s.category}${s.city == null ? '' : ' • ${s.city}'} aboneliğini silmek istiyor musun?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Vazgeç'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sil', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref
          .read(categorySubscriptionRepositoryProvider)
          .unsubscribe(s.id);
      // ignore: unused_result
      ref.refresh(categorySubscriptionsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Silinemedi: $e')),
        );
      }
    }
  }
}
