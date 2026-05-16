import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/list_skeleton.dart';
import '../data/job_template_repository.dart';

class JobTemplatesScreen extends ConsumerWidget {
  const JobTemplatesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tplAsync = ref.watch(jobTemplatesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Şablonlarım'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: tplAsync.when(
        loading: () => ListSkeleton(itemCount: 5, itemBuilder: (_) => const NotificationSkeleton()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Hata: ${e.toString().replaceFirst('Exception: ', '')}',
                textAlign: TextAlign.center),
          ),
        ),
        data: (templates) {
          if (templates.isEmpty) return const _EmptyState();
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(jobTemplatesProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: templates.length,
              itemBuilder: (ctx, i) =>
                  _TemplateCard(template: templates[i]),
            ),
          );
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(32),
      children: const [
        SizedBox(height: 80),
        Icon(Icons.bookmark_border, size: 64, color: AppColors.textSecondary),
        SizedBox(height: 16),
        Text(
          'Henüz şablon yok.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        SizedBox(height: 8),
        Text(
          "İlan açtıktan sonra üst kısmındaki 'Şablon olarak kaydet' kutusunu işaretleyerek hızlıca tekrar kullanabilirsin.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
      ],
    );
  }
}

class _TemplateCard extends ConsumerStatefulWidget {
  final Map<String, dynamic> template;
  const _TemplateCard({required this.template});

  @override
  ConsumerState<_TemplateCard> createState() => _TemplateCardState();
}

class _TemplateCardState extends ConsumerState<_TemplateCard> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final t = widget.template;
    final name = (t['name'] as String?) ?? 'Şablon';
    final title = (t['title'] as String?) ?? '';
    final useCount = (t['useCount'] as num?)?.toInt() ?? 0;
    final id = t['id'] as String;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(name,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('$useCount× kullanıldı',
                      style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(title,
                style: const TextStyle(
                    fontSize: 13, color: AppColors.textSecondary),
                maxLines: 2,
                overflow: TextOverflow.ellipsis),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed:
                        _busy ? null : () => _instantiate(id),
                    icon: const Icon(Icons.flash_on, size: 18),
                    label: const Text('Bu Şablonla İlan Aç'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _busy ? null : () => _delete(id),
                  icon: const Icon(Icons.delete_outline,
                      color: AppColors.error),
                  tooltip: 'Sil',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _instantiate(String id) async {
    setState(() => _busy = true);
    try {
      final job = await ref
          .read(jobTemplateRepositoryProvider)
          .instantiate(id);
      if (!mounted) return;
      ref.invalidate(jobTemplatesProvider);
      final title = (job['title'] as String?) ?? 'İlan';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"$title" yayınlandı'),
          backgroundColor: AppColors.primary,
          action: SnackBarAction(
            label: 'İlanlarım',
            textColor: Colors.white,
            onPressed: () => context.go('/?tab=2'),
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content:
              Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Şablonu sil?'),
        content: const Text('Bu şablon kalıcı olarak silinecek.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Vazgeç')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Sil',
                  style: TextStyle(color: AppColors.error))),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      await ref.read(jobTemplateRepositoryProvider).delete(id);
      if (mounted) ref.invalidate(jobTemplatesProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content:
              Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
