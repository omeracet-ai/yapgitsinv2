import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../categories/data/category_repository.dart';
import '../../data/worker_documents_repository.dart';

/// Profil > Belgelerim
/// Ustalık belgesi OPSİYONELDİR. Belge yüklendiğinde o kategori için
/// "Usta" ünvanı + doğrulama kartı otomatik kazanılır (admin sonradan
/// status='revoked' ile iptal edebilir). Gating yok; belge olmadan da
/// kullanıcı serbestçe ilan/teklif verebilir.
class WorkerDocumentsScreen extends ConsumerStatefulWidget {
  const WorkerDocumentsScreen({super.key});

  @override
  ConsumerState<WorkerDocumentsScreen> createState() =>
      _WorkerDocumentsScreenState();
}

class _WorkerDocumentsScreenState extends ConsumerState<WorkerDocumentsScreen> {
  bool _uploading = false;

  Future<void> _addDocument() async {
    final cats = await ref.read(categoriesProvider.future);
    if (!mounted || cats.isEmpty) return;

    final selectedCategory = await showModalBottomSheet<String>(
      useSafeArea: true,
      context: context,
      isScrollControlled: true,
      builder: (_) => _CategoryPickerSheet(categories: cats),
    );
    if (selectedCategory == null || !mounted) return;

    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 2000,
      imageQuality: 85,
    );
    if (file == null || !mounted) return;

    final titleCtrl = TextEditingController();
    final title = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Belge başlığı (opsiyonel)'),
        content: TextField(
          controller: titleCtrl,
          decoration: const InputDecoration(
            hintText: 'Örn: Elektrik Tesisatçısı Sertifikası',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, ''),
            child: const Text('Atla'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, titleCtrl.text.trim()),
            child: const Text('Yükle'),
          ),
        ],
      ),
    );
    if (title == null || !mounted) return;

    setState(() => _uploading = true);
    try {
      final repo = ref.read(workerDocumentsRepositoryProvider);
      final url = await repo.uploadFile(file);
      await repo.add(
        category: selectedCategory,
        url: url,
        title: title.isEmpty ? null : title,
      );
      ref.invalidate(myWorkerDocumentsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('"$selectedCategory" için belge yüklendi — Hizmet Veren ünvanı aktif.'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Yükleme başarısız: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _removeDocument(String id, String category) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Belgeyi sil'),
        content: Text(
            '"$category" kategorisindeki belgeyi silmek istediğinden emin misin? Bu kategorideki son belge ise Hizmet Veren ünvanın kalkacak.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Vazgeç'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(workerDocumentsRepositoryProvider).remove(id);
      ref.invalidate(myWorkerDocumentsProvider);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Silinemedi: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final docsAsync = ref.watch(myWorkerDocumentsProvider);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Belgelerim'),
        backgroundColor: AppColors.headerBackground(context),
        foregroundColor: Colors.white,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _uploading ? null : _addDocument,
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: _uploading
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                    color: Colors.white, strokeWidth: 2),
              )
            : const Icon(Icons.add),
        label: const Text('Belge Ekle'),
      ),
      body: docsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (docs) {
          if (docs.isEmpty) {
            return const _EmptyState();
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            itemCount: docs.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) {
              final d = docs[i];
              final id = d['id'] as String? ?? '';
              final category = d['category'] as String? ?? '';
              final title = d['title'] as String? ?? 'Yeterlilik belgesi';
              final status = d['status'] as String? ?? 'active';
              final createdAt = d['createdAt'] as String?;
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: status == 'active'
                        ? AppColors.primary.withValues(alpha: 0.3)
                        : AppColors.error.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      status == 'active'
                          ? Icons.verified_rounded
                          : Icons.block_rounded,
                      color: status == 'active'
                          ? AppColors.primary
                          : AppColors.error,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(category,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 14)),
                          Text(title,
                              style: TextStyle(
                                  fontSize: 12, color: AppColors.textSecondary)),
                          if (createdAt != null)
                            Text(_formatDate(createdAt),
                                style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textSecondary)),
                          if (status != 'active')
                            const Text('Admin tarafından iptal edildi',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.error,
                                    fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline,
                          color: AppColors.error),
                      onPressed: () => _removeDocument(id, category),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  static String _formatDate(String iso) {
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
    } catch (_) {
      return iso.length >= 10 ? iso.substring(0, 10) : iso;
    }
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.workspace_premium_outlined,
              size: 72, color: AppColors.textHint),
          const SizedBox(height: 16),
          const Text('Henüz belgen yok',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(
            'Belge yüklemek opsiyoneldir. Yeterlilik belgeni yüklediğinde '
            'o kategoride "Hizmet Veren" ünvanı + doğrulama kartı kazanırsın.',
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: 13, color: AppColors.textSecondary, height: 1.5),
          ),
        ],
      ),
    );
  }
}

class _CategoryPickerSheet extends StatelessWidget {
  final List<Map<String, dynamic>> categories;
  const _CategoryPickerSheet({required this.categories});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, scrollCtrl) => Column(
        children: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade400,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
            child: Text('Kategori seç',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          Expanded(
            child: ListView.builder(
              controller: scrollCtrl,
              itemCount: categories.length,
              itemBuilder: (_, i) {
                final c = categories[i];
                final name = c['name'] as String? ?? '';
                final icon = c['icon'] as String? ?? '📋';
                return ListTile(
                  leading: Text(icon, style: const TextStyle(fontSize: 22)),
                  title: Text(name),
                  onTap: () => Navigator.pop(context, name),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
