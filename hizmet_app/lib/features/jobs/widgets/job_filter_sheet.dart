import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/intl_formatter.dart';
import '../data/job_filter.dart';

/// İş ilanları için filtre bottom sheet'i.
/// showModalBottomSheet ile çağrılır; onay aninda JobFilter döner (yoksa null).
class JobFilterSheet extends StatefulWidget {
  final JobFilter initial;
  const JobFilterSheet({super.key, required this.initial});

  @override
  State<JobFilterSheet> createState() => _JobFilterSheetState();
}

class _JobFilterSheetState extends State<JobFilterSheet> {
  late RangeValues _budget;
  late JobSort _sort;
  late bool _featuredOnly;
  // Phase 297 — mesafe filtresi (km). null = kapalı.
  double? _radiusKm;
  double? _userLat;
  double? _userLng;

  // Bütçe slider sınırları (TL)
  static const double _minBudget = 0;
  static const double _maxBudget = 10000;
  // Mesafe sınırları (km)
  static const double _minRadius = 1;
  static const double _maxRadius = 100;

  @override
  void initState() {
    super.initState();
    final f = widget.initial;
    _budget = RangeValues(
      (f.budgetMin ?? _minBudget).clamp(_minBudget, _maxBudget).toDouble(),
      (f.budgetMax ?? _maxBudget).clamp(_minBudget, _maxBudget).toDouble(),
    );
    _sort = f.sort;
    _featuredOnly = f.featuredOnly;
    _radiusKm = f.maxRadiusKm;
    _userLat = f.userLat;
    _userLng = f.userLng;
  }

  void _reset() {
    setState(() {
      _budget = const RangeValues(_minBudget, _maxBudget);
      _sort = JobSort.newest;
      _featuredOnly = false;
      _radiusKm = null;
    });
  }

  void _apply() {
    final budgetMinSet = _budget.start > _minBudget;
    final budgetMaxSet = _budget.end < _maxBudget;
    final result = JobFilter(
      budgetMin: budgetMinSet ? _budget.start : null,
      budgetMax: budgetMaxSet ? _budget.end : null,
      sort: _sort,
      featuredOnly: _featuredOnly,
      maxRadiusKm: _radiusKm,
      userLat: _userLat,
      userLng: _userLng,
    );
    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        12,
        20,
        // Sistem gesture/nav bar yüksekliği + klavye + ekstra boşluk
        20 +
            MediaQuery.of(context).viewInsets.bottom +
            MediaQuery.of(context).padding.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            children: [
              Text('Filtrele',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary)),
              const Spacer(),
              TextButton(
                onPressed: _reset,
                child: const Text('Sıfırla'),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // ── Mesafe (Phase 299 — en üste alındı) ──────────────────────
          Row(
            children: [
              Text('Mesafe',
                  style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
              const Spacer(),
              Switch.adaptive(
                value: _radiusKm != null,
                activeThumbColor: AppColors.primary,
                onChanged: (v) =>
                    setState(() => _radiusKm = v ? 20.0 : null),
              ),
            ],
          ),
          if (_radiusKm != null) ...[
            Text(
              '${_radiusKm!.toInt()} km yarıçap içindeki ilanlar',
              style: TextStyle(
                  color: AppColors.textSecondary, fontSize: 12),
            ),
            Slider(
              value: _radiusKm!.clamp(_minRadius, _maxRadius),
              min: _minRadius,
              max: _maxRadius,
              divisions: 33,
              activeColor: AppColors.primary,
              inactiveColor: AppColors.primary.withValues(alpha: 0.2),
              label: '${_radiusKm!.toInt()} km',
              onChanged: (v) => setState(() => _radiusKm = v),
            ),
          ] else
            Text(
              'Kapalı — tüm konumlardaki ilanlar görünür.',
              style:
                  TextStyle(fontSize: 12, color: AppColors.textHint),
            ),

          const SizedBox(height: 16),
          // ── Bütçe Aralığı ───────────────────────────────────────────
          Text('Bütçe Aralığı',
              style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          Text(
            IntlFormatter.tlRange(_budget.start, _budget.end),
            style: TextStyle(
                color: AppColors.textSecondary, fontSize: 13),
          ),
          RangeSlider(
            values: _budget,
            min: _minBudget,
            max: _maxBudget,
            divisions: 40,
            activeColor: AppColors.primary,
            inactiveColor: AppColors.primary.withValues(alpha: 0.2),
            labels: RangeLabels(
              IntlFormatter.tl(_budget.start),
              IntlFormatter.tl(_budget.end),
            ),
            onChanged: (v) => setState(() => _budget = v),
          ),

          const SizedBox(height: 8),
          Text('Sıralama',
              style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              _sortChip(JobSort.newest, 'En Yeni'),
              _sortChip(JobSort.budgetHigh, 'Bütçe ↓'),
              _sortChip(JobSort.budgetLow, 'Bütçe ↑'),
            ],
          ),

          const SizedBox(height: 16),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: Text('Sadece Öne Çıkanlar',
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary)),
            subtitle: Text(
              'Yalnızca ⭐ öne çıkarılmış ilanları göster',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            activeThumbColor: AppColors.primary,
            value: _featuredOnly,
            onChanged: (v) => setState(() => _featuredOnly = v),
          ),

          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _apply,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('Uygula',
                  style: TextStyle(
                      fontSize: 15, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sortChip(JobSort value, String label) {
    final active = _sort == value;
    return GestureDetector(
      onTap: () => setState(() => _sort = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? AppColors.primary : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: active ? Colors.black : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}
