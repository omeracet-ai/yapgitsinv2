import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../data/auth_repository.dart';
import '../presentation/providers/auth_provider.dart';

/// Haftalık müsaitlik düzenleyici (Pzt → Pzr).
/// Mevcut schedule null ise tüm günler "müsait" varsayılır.
class AvailabilityEditorSheet extends ConsumerStatefulWidget {
  final Map<String, bool>? initial;
  const AvailabilityEditorSheet({super.key, this.initial});

  static Future<void> show(BuildContext context,
      {Map<String, bool>? initial}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => AvailabilityEditorSheet(initial: initial),
    );
  }

  @override
  ConsumerState<AvailabilityEditorSheet> createState() =>
      _AvailabilityEditorSheetState();
}

class _AvailabilityEditorSheetState
    extends ConsumerState<AvailabilityEditorSheet> {
  // Backend kontratı sırası
  static const _keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  static const _labels = {
    'mon': 'Pazartesi',
    'tue': 'Salı',
    'wed': 'Çarşamba',
    'thu': 'Perşembe',
    'fri': 'Cuma',
    'sat': 'Cumartesi',
    'sun': 'Pazar',
  };

  late Map<String, bool> _schedule;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final init = widget.initial;
    _schedule = {for (final k in _keys) k: init == null ? true : (init[k] ?? false)};
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      // Hepsi true ise null gönder ("her gün müsait" — varsayılan)
      final allTrue = _schedule.values.every((v) => v);
      final payload = allTrue ? null : Map<String, bool>.from(_schedule);
      await ref.read(authRepositoryProvider).updateAvailability(payload);
      ref.read(authStateProvider.notifier)
          .updateUserData({'availabilitySchedule': payload});
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Müsaitlik güncellendi'),
              backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _reset() async {
    setState(() => _saving = true);
    try {
      await ref.read(authRepositoryProvider).updateAvailability(null);
      ref.read(authStateProvider.notifier)
          .updateUserData({'availabilitySchedule': null});
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Sıfırlandı — her gün müsait'),
              backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Icon(Icons.calendar_month_outlined,
                      color: AppColors.primary, size: 22),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text('Müsaitlik Programı',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: Text(
                  'Hangi günler iş alabileceğinizi belirleyin. Tüm günler açıkken sıfırlamış sayılır.',
                  style:
                      TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            ),
            const Divider(height: 1),
            ..._keys.map((k) => SwitchListTile(
                  value: _schedule[k] ?? false,
                  onChanged: _saving
                      ? null
                      : (v) => setState(() => _schedule[k] = v),
                  title: Text(_labels[k]!,
                      style: const TextStyle(fontWeight: FontWeight.w500)),
                  activeThumbColor: AppColors.primary,
                )),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _saving ? null : _reset,
                      child: const Text('Sıfırla'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _saving ? null : _save,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Kaydet'),
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
}

/// Public profilde gösterilen küçük gün rozetleri.
class AvailabilityChips extends StatelessWidget {
  final Map<String, bool> schedule;
  const AvailabilityChips({super.key, required this.schedule});

  static const _order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  static const _short = {
    'mon': 'Pzt',
    'tue': 'Sal',
    'wed': 'Çar',
    'thu': 'Per',
    'fri': 'Cum',
    'sat': 'Cmt',
    'sun': 'Paz',
  };

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: _order.map((k) {
        final on = schedule[k] == true;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: on ? AppColors.success.withValues(alpha: 0.15) : Colors.grey.shade200,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: on ? AppColors.success : Colors.grey.shade300,
              width: 1,
            ),
          ),
          child: Text(
            _short[k]!,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: on ? AppColors.success : Colors.grey.shade500,
            ),
          ),
        );
      }).toList(),
    );
  }
}
