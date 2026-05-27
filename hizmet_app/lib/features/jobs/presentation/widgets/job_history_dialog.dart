import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/services/intl_formatter.dart';
import '../screens/job_detail_screen.dart';
import '../providers/job_provider.dart';

/// "İşlerim" sekmesinde ilan kartına tap → bu pop-up açılır.
///
/// Tam ekran detay yerine bottom sheet içinde hızlı bir geçmiş kartı gösterir.
/// "Detayı Aç" butonu mevcut [JobDetailScreen]'e push eder.
class JobHistoryDialog extends StatefulWidget {
  final Map<String, dynamic> job;
  const JobHistoryDialog({super.key, required this.job});

  /// Modal bottom sheet olarak göster. Mobile-native, max %85 ekran.
  static Future<void> show(BuildContext context, Map<String, dynamic> job) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black54,
      builder: (_) => JobHistoryDialog(job: job),
    );
  }

  @override
  State<JobHistoryDialog> createState() => _JobHistoryDialogState();
}

class _JobHistoryDialogState extends State<JobHistoryDialog> {
  bool _expandDescription = false;

  @override
  Widget build(BuildContext context) {
    final job = widget.job;

    final id = job['id'] as String? ?? '';
    final title = job['title'] as String? ?? '';
    final description = job['description'] as String? ?? '';
    final category = job['category'] as String? ?? '';
    final location = job['location'] as String? ?? '';
    final status = job['status'] as String? ?? 'open';
    final budgetMin = (job['budgetMin'] as num?)?.toInt() ?? 0;
    final budgetMax = (job['budgetMax'] as num?)?.toInt() ?? 0;
    final createdAtRaw = job['createdAt'] as String? ?? '';
    final dueDateRaw = job['dueDate'] as String?;
    final createdDate = _formatDate(createdAtRaw);
    final dueDate = dueDateRaw != null ? _formatDate(dueDateRaw) : null;

    final photos = (job['photos'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        const <String>[];

    // Müşteri bilgisi (varsa); Worker tarafında offer.job içinden gelir.
    final customer = (job['customer'] as Map<String, dynamic>?) ??
        (job['user'] as Map<String, dynamic>?);
    final customerName = customer?['fullName'] as String? ??
        customer?['name'] as String? ??
        '';
    final customerAvatar = customer?['profileImageUrl'] as String?;

    final (statusLabel, statusColor) = _statusLabel(status);

    final viewportHeight = MediaQuery.of(context).size.height;
    final maxHeight = viewportHeight * 0.85;

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.85,
      expand: false,
      builder: (context, scrollController) {
        return ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxHeight),
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 24,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              children: [
                // Drag handle
                Container(
                  margin: const EdgeInsets.only(top: 10, bottom: 6),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // Header (status + close)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 8, 8),
                  child: Row(
                    children: [
                      _statusChip(statusLabel, statusColor),
                      const Spacer(),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close),
                        color: AppColors.textSecondary,
                        tooltip: 'Kapat',
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Title
                        Text(
                          title.isEmpty ? 'İlan' : title,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 10),
                        // Category chip
                        if (category.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color:
                                    AppColors.primary.withValues(alpha: 0.25),
                              ),
                            ),
                            child: Text(
                              category,
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        const SizedBox(height: 14),
                        // Meta grid: tarih + due + konum + bütçe
                        _metaRow(
                          icon: Icons.event_outlined,
                          label: 'Açılış',
                          value: createdDate.isEmpty ? '—' : createdDate,
                        ),
                        if (dueDate != null && dueDate.isNotEmpty)
                          _metaRow(
                            icon: Icons.schedule_outlined,
                            label: 'Teslim',
                            value: dueDate,
                          ),
                        if (location.isNotEmpty)
                          _metaRow(
                            icon: Icons.location_on_outlined,
                            label: 'Konum',
                            value: location,
                          ),
                        if (budgetMin > 0 || budgetMax > 0)
                          _metaRow(
                            icon: Icons.payments_outlined,
                            label: 'Bütçe',
                            value: _budget(context, budgetMin, budgetMax),
                            valueColor: AppColors.primary,
                          ),
                        // Customer card
                        if (customerName.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          _customerTile(customerName, customerAvatar),
                        ],
                        // Description
                        if (description.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          Text(
                            'Açıklama',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          AnimatedSize(
                            duration: const Duration(milliseconds: 180),
                            curve: Curves.easeOut,
                            alignment: Alignment.topLeft,
                            child: Text(
                              description,
                              maxLines: _expandDescription ? null : 3,
                              overflow: _expandDescription
                                  ? TextOverflow.visible
                                  : TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 14,
                                height: 1.4,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          if (description.length > 120)
                            Align(
                              alignment: Alignment.centerLeft,
                              child: TextButton(
                                onPressed: () => setState(
                                    () => _expandDescription = !_expandDescription),
                                style: TextButton.styleFrom(
                                  foregroundColor: AppColors.primary,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 4, vertical: 4),
                                  minimumSize: const Size(0, 28),
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  _expandDescription
                                      ? 'Daha az'
                                      : 'Daha fazla',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                        ],
                        // Photos
                        if (photos.isNotEmpty) ...[
                          const SizedBox(height: 14),
                          Text(
                            'Fotoğraflar',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            height: 72,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: photos.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: 8),
                              itemBuilder: (_, i) => ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: Image.network(
                                  photos[i],
                                  width: 72,
                                  height: 72,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 72,
                                    height: 72,
                                    color: AppColors.border,
                                    child: Icon(
                                      Icons.image_not_supported,
                                      color: AppColors.textHint,
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),
                // Action bar
                _actionBar(context, id, job, title, category, status,
                    budgetMin, budgetMax, createdDate),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Builders ───────────────────────────────────────────────────────────────

  Widget _statusChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            margin: const EdgeInsets.only(right: 6),
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _metaRow({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.textSecondary),
          const SizedBox(width: 8),
          SizedBox(
            width: 64,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: valueColor ?? AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _customerTile(String name, String? avatarUrl) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: AppColors.primary.withValues(alpha: 0.15),
            backgroundImage:
                (avatarUrl != null && avatarUrl.isNotEmpty)
                    ? NetworkImage(avatarUrl)
                    : null,
            child: (avatarUrl == null || avatarUrl.isEmpty)
                ? Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'İlan sahibi',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionBar(
    BuildContext context,
    String id,
    Map<String, dynamic> job,
    String title,
    String category,
    String status,
    int budgetMin,
    int budgetMax,
    String createdDate,
  ) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        12 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textPrimary,
                side: BorderSide(color: AppColors.border),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Kapat'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => JobDetailScreen(
                      id: id,
                      title: title,
                      description: job['description'] as String? ?? '',
                      location: job['location'] as String? ?? '',
                      budget: '$budgetMin - $budgetMax ₺',
                      category: category,
                      postedAt: createdDate,
                      icon: Job.getIconForCategory(category),
                      color: Job.getColorForCategory(category),
                      isFeatured: job['featuredOrder'] != null,
                      customerId: job['customerId'] as String?,
                      photos: (job['photos'] as List<dynamic>?)
                              ?.map((e) => e.toString())
                              .toList() ??
                          const [],
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.open_in_new, size: 18),
              label: const Text('Detayı Aç'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  static String _formatDate(String iso) {
    if (iso.isEmpty || iso.length < 10) return '';
    return iso.substring(0, 10).split('-').reversed.join('.');
  }

  static String _budget(BuildContext context, int min, int max) {
    if (min > 0 && max > 0 && min != max) {
      return '${IntlFormatter.currency(context, min, decimalDigits: 0)} - ${IntlFormatter.currency(context, max, decimalDigits: 0)}';
    }
    final v = max > 0 ? max : min;
    return IntlFormatter.currency(context, v, decimalDigits: 0);
  }

  static (String, Color) _statusLabel(String status) {
    switch (status) {
      case 'open':
        return ('Açık', Colors.green);
      case 'in_progress':
        return ('Devam Ediyor', Colors.blue);
      case 'completed':
        return ('Tamamlandı', Colors.teal);
      case 'cancelled':
        return ('İptal', Colors.red);
      default:
        return ('Bilinmiyor', Colors.grey);
    }
  }
}
