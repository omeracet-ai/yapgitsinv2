import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Ustalık belgeleri kartı.
///
/// `documents` öğeleri backend'in `workerDocuments` formatına uyar:
///   { category, url, title?, status, createdAt }
/// Status 'active' olan belgeler "Usta" ünvanı ve kategori-özel doğrulama
/// kartı şeklinde gösterilir. Belge yoksa widget gizlenir.
///
/// Phase 349 — Onaylı kategoriler listesi açılır-kapanır ExpansionTile
/// içinde (İstatistikler sekmesi pattern'i). Başlık + N belge badge'i
/// her zaman görünür; tile expand edilince belge detayları açılır.
class WorkerDocumentsCard extends StatelessWidget {
  final List<Map<String, dynamic>> documents;
  final bool isSelf;
  const WorkerDocumentsCard({
    super.key,
    required this.documents,
    this.isSelf = false,
  });

  @override
  Widget build(BuildContext context) {
    final active = documents
        .where((d) => (d['status'] as String? ?? 'active') == 'active')
        .toList();
    if (active.isEmpty) return const SizedBox.shrink();

    final categories = active
        .map((d) => (d['category'] as String?) ?? '')
        .where((c) => c.isNotEmpty)
        .toSet()
        .toList();
    final subtitleText = categories.length <= 2
        ? categories.join(' · ')
        : '${categories.take(2).join(' · ')} +${categories.length - 2}';

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.10),
            AppColors.primary.withValues(alpha: 0.04),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: Theme.of(context).copyWith(
          dividerColor: Colors.transparent,
          listTileTheme: const ListTileThemeData(dense: true),
        ),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(
              horizontal: 12, vertical: 2),
          childrenPadding:
              const EdgeInsets.fromLTRB(12, 0, 12, 12),
          leading: const Icon(Icons.workspace_premium_rounded,
              color: AppColors.primary, size: 20),
          title: Row(
            children: [
              const Text('Hizmet Veren',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary)),
              const SizedBox(width: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('${active.length} belge',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          subtitle: subtitleText.isEmpty
              ? null
              : Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(subtitleText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary)),
                ),
          children: active.map((d) => _DocumentTile(doc: d)).toList(),
        ),
      ),
    );
  }
}

class _DocumentTile extends StatelessWidget {
  final Map<String, dynamic> doc;
  const _DocumentTile({required this.doc});

  @override
  Widget build(BuildContext context) {
    final category = (doc['category'] as String?) ?? '';
    final title = (doc['title'] as String?) ?? 'Yeterlilik belgesi';
    final createdAt = doc['createdAt'] as String?;
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.verified_rounded,
                color: AppColors.primary, size: 16),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(category,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.bold)),
                Text(title,
                    style: TextStyle(
                        fontSize: 11, color: AppColors.textSecondary),
                    overflow: TextOverflow.ellipsis),
                if (createdAt != null)
                  Text(_formatDate(createdAt),
                      style: TextStyle(
                          fontSize: 10, color: AppColors.textSecondary)),
              ],
            ),
          ),
          const Text('Belge yüklü ✓',
              style: TextStyle(
                  fontSize: 10,
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600)),
        ],
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
