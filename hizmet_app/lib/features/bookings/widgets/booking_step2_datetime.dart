import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../../core/theme/app_colors.dart';
import '../../calendar/data/firebase_booking_repository.dart';

/// Phase 135 — Inline TableCalendar with worker availability slots.
/// Disables: past dates, weeklyAvailable=false, fullyBooked=true.
class BookingStep2DateTime extends ConsumerStatefulWidget {
  final String workerId;
  final DateTime? scheduledDate;
  final TimeOfDay? scheduledTime;
  final ValueChanged<DateTime?> onDateChanged;
  final ValueChanged<TimeOfDay?> onTimeChanged;

  const BookingStep2DateTime({
    super.key,
    required this.workerId,
    required this.scheduledDate,
    required this.scheduledTime,
    required this.onDateChanged,
    required this.onTimeChanged,
  });

  @override
  ConsumerState<BookingStep2DateTime> createState() => _BookingStep2DateTimeState();
}

class _BookingStep2DateTimeState extends ConsumerState<BookingStep2DateTime> {
  final Map<String, _SlotInfo> _slots = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSlots();
  }

  Future<void> _loadSlots() async {
    final repo = ref.read(firebaseBookingRepositoryProvider);
    final list = await repo.getAvailabilitySlots(widget.workerId, days: 60);
    if (!mounted) return;
    setState(() {
      _slots.clear();
      for (final m in list) {
        final date = m['date']?.toString() ?? '';
        if (date.isEmpty) continue;
        _slots[date] = _SlotInfo(
          weeklyAvailable: m['weeklyAvailable'] == true,
          fullyBooked: m['fullyBooked'] == true,
          hasBooking: m['hasBooking'] == true,
        );
      }
      _loading = false;
    });
  }

  String _ymd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  bool _isDayDisabled(DateTime day) {
    final today = DateTime.now();
    final t0 = DateTime(today.year, today.month, today.day);
    if (day.isBefore(t0)) return true;
    final info = _slots[_ymd(day)];
    if (info == null) return false;
    return !info.weeklyAvailable || info.fullyBooked;
  }

  Future<void> _pickTime(BuildContext context) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: widget.scheduledTime ?? const TimeOfDay(hour: 10, minute: 0),
      helpText: 'Randevu saati seç',
      cancelText: 'İptal',
      confirmText: 'Tamam',
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked != null) widget.onTimeChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final firstDay = DateTime(today.year, today.month, today.day);
    final lastDay = firstDay.add(const Duration(days: 60));
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Tarih & Saat',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text('Müsait günü seçin (gri günler dolu/kapalı)',
              style: TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TableCalendar<void>(
                firstDay: firstDay,
                lastDay: lastDay,
                focusedDay: widget.scheduledDate ?? firstDay,
                selectedDayPredicate: (d) =>
                    widget.scheduledDate != null && isSameDay(d, widget.scheduledDate),
                enabledDayPredicate: (d) => !_isDayDisabled(d),
                onDaySelected: (selected, _) {
                  if (_isDayDisabled(selected)) return;
                  widget.onDateChanged(selected);
                },
                calendarStyle: const CalendarStyle(
                  outsideDaysVisible: false,
                  todayDecoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                  todayTextStyle: TextStyle(
                      color: AppColors.primary, fontWeight: FontWeight.bold),
                  selectedDecoration: BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  disabledTextStyle: TextStyle(color: Color(0xFFBDBDBD)),
                  disabledDecoration: BoxDecoration(
                    color: Color(0xFFF5F5F5),
                    shape: BoxShape.circle,
                  ),
                ),
                headerStyle: const HeaderStyle(
                  formatButtonVisible: false,
                  titleCentered: true,
                ),
              ),
            ),
          const SizedBox(height: 16),
          if (widget.scheduledDate != null)
            Text(
              'Seçilen: ${DateFormat('d MMMM yyyy, EEEE', 'tr_TR').format(widget.scheduledDate!)}',
              style: const TextStyle(
                  fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          const SizedBox(height: 12),
          _PickerCard(
            icon: Icons.access_time_rounded,
            label: 'Saat (opsiyonel)',
            value: widget.scheduledTime == null
                ? 'Saat seç'
                : '${widget.scheduledTime!.hour.toString().padLeft(2, '0')}:${widget.scheduledTime!.minute.toString().padLeft(2, '0')}',
            isSet: widget.scheduledTime != null,
            onTap: () => _pickTime(context),
            trailing: widget.scheduledTime == null
                ? null
                : IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => widget.onTimeChanged(null),
                  ),
          ),
        ],
      ),
    );
  }
}

class _SlotInfo {
  final bool weeklyAvailable;
  final bool fullyBooked;
  final bool hasBooking;
  _SlotInfo({
    required this.weeklyAvailable,
    required this.fullyBooked,
    required this.hasBooking,
  });
}

class _PickerCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final bool isSet;
  final VoidCallback onTap;
  final Widget? trailing;
  const _PickerCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.isSet,
    required this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          fontSize: 12, color: AppColors.textSecondary)),
                  const SizedBox(height: 2),
                  Text(value,
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isSet
                              ? AppColors.textPrimary
                              : AppColors.textHint)),
                ],
              ),
            ),
            if (trailing != null) trailing! else const Icon(Icons.chevron_right),
          ],
        ),
      ),
    );
  }
}
