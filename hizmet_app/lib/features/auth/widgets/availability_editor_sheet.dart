import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/network/api_client.dart';

/// Phase 211 â€” HaftalÄ±k mÃ¼saitlik dÃ¼zenleyici (gÃ¼n switch + saat aralÄ±ÄŸÄ±).
/// PUT /users/availability â€” 7-gÃ¼n array gÃ¶nderir.
class AvailabilityEditorSheet extends ConsumerStatefulWidget {
  /// Mevcut slot listesi: [{dayOfWeek, startTime, endTime}]
  final List<Map<String, dynamic>>? initialSlots;

  const AvailabilityEditorSheet({super.key, this.initialSlots});

  static Future<void> show(BuildContext context,
      {List<Map<String, dynamic>>? initialSlots}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) =>
          AvailabilityEditorSheet(initialSlots: initialSlots),
    );
  }

  @override
  ConsumerState<AvailabilityEditorSheet> createState() =>
      _AvailabilityEditorSheetState();
}

class _DaySlot {
  bool isAvailable;
  TimeOfDay startTime;
  TimeOfDay endTime;
  _DaySlot({
    required this.isAvailable,
    required this.startTime,
    required this.endTime,
  });
}

class _AvailabilityEditorSheetState
    extends ConsumerState<AvailabilityEditorSheet> {
  // 0=Pzr,1=Pzt,...,6=Cmt â€” backend convention (JS Date.getDay)
  static const _dayLabels = [
    'Pazar',
    'Pazartesi',
    'SalÄ±',
    'Ã‡arÅŸamba',
    'PerÅŸembe',
    'Cuma',
    'Cumartesi',
  ];

  // GÃ¶sterim sÄ±rasÄ±: Pazartesi Ã¶nce (1-6, sonra 0)
  static const _displayOrder = [1, 2, 3, 4, 5, 6, 0];

  late final List<_DaySlot> _slots; // index = dayOfWeek (0-6)
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    // VarsayÄ±lan: 09:00-18:00, kapalÄ±
    _slots = List.generate(
      7,
      (_) => _DaySlot(
        isAvailable: false,
        startTime: const TimeOfDay(hour: 9, minute: 0),
        endTime: const TimeOfDay(hour: 18, minute: 0),
      ),
    );
    // Mevcut slot'larÄ± yÃ¼kle
    final initial = widget.initialSlots;
    if (initial != null) {
      for (final s in initial) {
        final dow = s['dayOfWeek'] as int?;
        if (dow == null || dow < 0 || dow > 6) continue;
        _slots[dow].isAvailable = true;
        final start = _parseTime(s['startTime'] as String? ?? '09:00');
        final end = _parseTime(s['endTime'] as String? ?? '18:00');
        _slots[dow].startTime = start;
        _slots[dow].endTime = end;
      }
    }
  }

  TimeOfDay _parseTime(String hm) {
    final parts = hm.split(':');
    if (parts.length != 2) return const TimeOfDay(hour: 9, minute: 0);
    return TimeOfDay(
      hour: int.tryParse(parts[0]) ?? 9,
      minute: int.tryParse(parts[1]) ?? 0,
    );
  }

  String _formatTime(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  bool _isValidRange(int dow) {
    final s = _slots[dow];
    final startMin = s.startTime.hour * 60 + s.startTime.minute;
    final endMin = s.endTime.hour * 60 + s.endTime.minute;
    return startMin < endMin;
  }

  Future<void> _pickTime(int dow, bool isStart) async {
    final slot = _slots[dow];
    final initial = isStart ? slot.startTime : slot.endTime;
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
      helpText: isStart ? 'BaÅŸlangÄ±Ã§ saati' : 'BitiÅŸ saati',
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      setState(() {
        if (isStart) {
          slot.startTime = picked;
        } else {
          slot.endTime = picked;
        }
      });
    }
  }

  Future<void> _save() async {
    // Validasyon
    for (final dow in _displayOrder) {
      if (_slots[dow].isAvailable && !_isValidRange(dow)) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(
              '${_dayLabels[dow]}: baÅŸlangÄ±Ã§ saati bitiÅŸ saatinden Ã¶nce olmalÄ±'),
          backgroundColor: Colors.red,
        ));
        return;
      }
    }

    setState(() => _saving = true);
    try {
      final client = ApiClient();
      final days = List.generate(7, (dow) {
        final s = _slots[dow];
        return {
          'dayOfWeek': dow,
          'startTime': _formatTime(s.startTime),
          'endTime': _formatTime(s.endTime),
          'isAvailable': s.isAvailable,
        };
      });
      await client.dio.put('/users/availability', data: {'days': days});
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('MÃ¼saitlik takvimi gÃ¼ncellendi'),
          backgroundColor: Colors.green,
        ));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.red,
        ));
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
                  Icon(Icons.event_available_outlined,
                      color: AppColors.primary, size: 22),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text('MÃ¼saitlik Takvimi',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: Text(
                'Hangi gÃ¼n ve saatlerde iÅŸ alabileceÄŸinizi belirleyin.',
                style:
                    TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ),
            const Divider(height: 1),
            ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.55,
              ),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _displayOrder.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1, indent: 16, endIndent: 16),
                itemBuilder: (_, i) {
                  final dow = _displayOrder[i];
                  final slot = _slots[dow];
                  return _DayRow(
                    label: _dayLabels[dow],
                    slot: slot,
                    saving: _saving,
                    onToggle: (v) => setState(() => slot.isAvailable = v),
                    onPickStart: () => _pickTime(dow, true),
                    onPickEnd: () => _pickTime(dow, false),
                    formatTime: _formatTime,
                  );
                },
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Kaydet'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DayRow extends StatelessWidget {
  final String label;
  final _DaySlot slot;
  final bool saving;
  final ValueChanged<bool> onToggle;
  final VoidCallback onPickStart;
  final VoidCallback onPickEnd;
  final String Function(TimeOfDay) formatTime;

  const _DayRow({
    required this.label,
    required this.slot,
    required this.saving,
    required this.onToggle,
    required this.onPickStart,
    required this.onPickEnd,
    required this.formatTime,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w500)),
          ),
          Switch(
            value: slot.isAvailable,
            onChanged: saving ? null : onToggle,
            activeColor: AppColors.primary,
          ),
          if (slot.isAvailable) ...[
            const SizedBox(width: 8),
            Expanded(
              child: Row(
                children: [
                  _TimeButton(
                    label: formatTime(slot.startTime),
                    onTap: saving ? null : onPickStart,
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: Text('â€“',
                        style: TextStyle(color: AppColors.textSecondary)),
                  ),
                  _TimeButton(
                    label: formatTime(slot.endTime),
                    onTap: saving ? null : onPickEnd,
                  ),
                ],
              ),
            ),
          ] else
            const Expanded(
              child: Text('KapalÄ±',
                  style: TextStyle(
                      color: AppColors.textHint, fontSize: 13)),
            ),
        ],
      ),
    );
  }
}

class _TimeButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;

  const _TimeButton({required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Text(
          label,
          style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.primary),
        ),
      ),
    );
  }
}

/// Public profilde gÃ¶sterilen kÃ¼Ã§Ã¼k gÃ¼n rozetleri.
/// Hem eski schedule (Map<String,bool>) hem yeni slot listesi desteklenir.
class AvailabilityChips extends StatelessWidget {
  /// Slot listesi: [{dayOfWeek: int, startTime: str, endTime: str}]
  final List<Map<String, dynamic>>? slots;

  /// Legacy: basit gÃ¼n aÃ§Ä±k/kapalÄ± haritasÄ±
  final Map<String, bool>? schedule;

  const AvailabilityChips({super.key, this.slots, this.schedule});

  static const _dowToKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  static const _shortLabels = {
    'mon': 'Pzt',
    'tue': 'Sal',
    'wed': 'Ã‡ar',
    'thu': 'Per',
    'fri': 'Cum',
    'sat': 'Cmt',
    'sun': 'Paz',
  };
  static const _order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  @override
  Widget build(BuildContext context) {
    // Slot listesinden gÃ¼n seti oluÅŸtur
    final Set<String> activeDays = {};
    if (slots != null) {
      for (final s in slots!) {
        final dow = s['dayOfWeek'] as int?;
        if (dow != null && dow >= 0 && dow <= 6) {
          activeDays.add(_dowToKey[dow]);
        }
      }
    } else if (schedule != null) {
      for (final e in schedule!.entries) {
        if (e.value == true) activeDays.add(e.key);
      }
    }

    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: _order.map((k) {
        final on = activeDays.contains(k);
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: on
                ? AppColors.success.withValues(alpha: 0.15)
                : Colors.grey.shade200,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: on ? AppColors.success : Colors.grey.shade300,
              width: 1,
            ),
          ),
          child: Text(
            _shortLabels[k]!,
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
