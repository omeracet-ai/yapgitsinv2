import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';
import '../data/worker_filter.dart';

/// Phase 39 — Worker Filter Bottom Sheet
///
/// Kullanım:
/// ```dart
/// final result = await showModalBottomSheet<WorkerFilter>(
///   context: context,
///   isScrollControlled: true,
///   backgroundColor: Colors.transparent,
///   builder: (_) => WorkerFilterSheet(initial: current),
/// );
/// if (result != null) ref.read(workerFilterProvider.notifier).state = result;
/// ```
class WorkerFilterSheet extends StatefulWidget {
  final WorkerFilter initial;
  const WorkerFilterSheet({super.key, required this.initial});

  @override
  State<WorkerFilterSheet> createState() => _WorkerFilterSheetState();
}

class _WorkerFilterSheetState extends State<WorkerFilterSheet> {
  late double? _minRating;
  late bool _verifiedOnly;
  late bool _availableOnly;
  late WorkerSortBy _sortBy;
  late TextEditingController _minRateCtrl;
  late TextEditingController _maxRateCtrl;

  static const _ratingOptions = <double?>[null, 3.0, 3.5, 4.0, 4.5];

  @override
  void initState() {
    super.initState();
    _minRating = widget.initial.minRating;
    _verifiedOnly = widget.initial.verifiedOnly;
    _availableOnly = widget.initial.availableOnly;
    _sortBy = widget.initial.sortBy;
    _minRateCtrl = TextEditingController(
        text: widget.initial.minRate?.toInt().toString() ?? '');
    _maxRateCtrl = TextEditingController(
        text: widget.initial.maxRate?.toInt().toString() ?? '');
  }

  @override
  void dispose() {
    _minRateCtrl.dispose();
    _maxRateCtrl.dispose();
    super.dispose();
  }

  void _reset() {
    setState(() {
      _minRating = null;
      _verifiedOnly = false;
      _availableOnly = false;
      _sortBy = WorkerSortBy.reputation;
      _minRateCtrl.clear();
      _maxRateCtrl.clear();
    });
  }

  void _apply() {
    final minRate = double.tryParse(_minRateCtrl.text.trim());
    final maxRate = double.tryParse(_maxRateCtrl.text.trim());
    final result = WorkerFilter(
      minRating: _minRating,
      minRate: minRate,
      maxRate: maxRate,
      verifiedOnly: _verifiedOnly,
      availableOnly: _availableOnly,
      sortBy: _sortBy,
    );
    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: mq.viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        constraints: BoxConstraints(maxHeight: mq.size.height * 0.85),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 12, 4),
              child: Row(
                children: [
                  const Text('Filtrele',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _sectionTitle('Minimum Yıldız'),
                    const SizedBox(height: 8),
                    _buildRatingChips(),
                    const SizedBox(height: 20),
                    _sectionTitle('Saat Ücreti (₺)'),
                    const SizedBox(height: 8),
                    _buildRateInputs(),
                    const SizedBox(height: 20),
                    _sectionTitle('Sıralama'),
                    const SizedBox(height: 8),
                    _buildSortChips(),
                    const SizedBox(height: 20),
                    _buildSwitch(
                      title: 'Sadece doğrulanmış',
                      subtitle: 'Mavi tikli ustalar',
                      icon: Icons.verified_rounded,
                      iconColor: Colors.blue,
                      value: _verifiedOnly,
                      onChanged: (v) => setState(() => _verifiedOnly = v),
                    ),
                    const SizedBox(height: 8),
                    _buildSwitch(
                      title: 'Sadece müsait',
                      subtitle: 'Şu anda iş alabilen',
                      icon: Icons.bolt_rounded,
                      iconColor: AppColors.success,
                      value: _availableOnly,
                      onChanged: (v) => setState(() => _availableOnly = v),
                    ),
                  ],
                ),
              ),
            ),
            // Buttons
            const Divider(height: 1),
            Padding(
              padding: EdgeInsets.fromLTRB(
                  16, 12, 16, 12 + mq.padding.bottom),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _reset,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: AppColors.border),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Sıfırla',
                          style: TextStyle(
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: _apply,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Uygula',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String s) => Text(
        s,
        style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary),
      );

  Widget _buildRatingChips() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: _ratingOptions.map((r) {
        final active = _minRating == r;
        final label = r == null ? 'Hepsi' : '${r.toStringAsFixed(1)}+';
        return GestureDetector(
          onTap: () => setState(() => _minRating = r),
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: active ? AppColors.primary : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: active ? AppColors.primary : AppColors.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (r != null)
                  Icon(Icons.star_rounded,
                      size: 14,
                      color: active ? Colors.white : Colors.amber.shade600),
                if (r != null) const SizedBox(width: 4),
                Text(label,
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: active ? Colors.white : AppColors.textPrimary)),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildRateInputs() {
    return Row(
      children: [
        Expanded(child: _rateField(_minRateCtrl, 'Min ₺')),
        const SizedBox(width: 12),
        Expanded(child: _rateField(_maxRateCtrl, 'Max ₺')),
      ],
    );
  }

  Widget _rateField(TextEditingController ctrl, String hint) {
    return TextField(
      controller: ctrl,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppColors.textHint),
        prefixIcon: const Icon(Icons.payments_outlined,
            size: 18, color: AppColors.textHint),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        filled: true,
        fillColor: AppColors.background,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.4),
        ),
      ),
    );
  }

  Widget _buildSortChips() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: WorkerSortBy.values.map((s) {
        final active = _sortBy == s;
        return GestureDetector(
          onTap: () => setState(() => _sortBy = s),
          child: Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: active ? AppColors.primary : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: active ? AppColors.primary : AppColors.border),
            ),
            child: Text(s.label,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: active ? Colors.white : AppColors.textPrimary)),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSwitch({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary)),
                const SizedBox(height: 2),
                Text(subtitle,
                    style: const TextStyle(
                        fontSize: 11, color: AppColors.textHint)),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppColors.primary,
          ),
        ],
      ),
    );
  }
}
