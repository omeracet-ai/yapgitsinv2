import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../../core/models/booking_model.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/list_skeleton.dart';
import '../data/booking_repository.dart';
import '../../escrow/widgets/escrow_status_badge.dart';

enum _ViewMode { list, calendar }

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen>
    with SingleTickerProviderStateMixin {
  _ViewMode _mode = _ViewMode.list;
  late final TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Randevularım',
            style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        bottom: TabBar(
          controller: _tab,
          tabs: const [
            Tab(text: 'Müşteri'),
            Tab(text: 'Usta'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(myWorkerBookingsProvider);
              ref.invalidate(myCustomerBookingsProvider);
            },
          )
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: SegmentedButton<_ViewMode>(
              segments: const [
                ButtonSegment(
                    value: _ViewMode.list,
                    label: Text('Liste'),
                    icon: Icon(Icons.view_list)),
                ButtonSegment(
                    value: _ViewMode.calendar,
                    label: Text('Takvim'),
                    icon: Icon(Icons.calendar_month)),
              ],
              selected: {_mode},
              onSelectionChanged: (s) => setState(() => _mode = s.first),
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tab,
              children: [
                _BookingsView(
                  mode: _mode,
                  provider: myCustomerBookingsProvider,
                ),
                _BookingsView(
                  mode: _mode,
                  provider: myWorkerBookingsProvider,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingsView extends ConsumerWidget {
  final _ViewMode mode;
  final FutureProvider<List<Booking>> provider;

  const _BookingsView({required this.mode, required this.provider});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(provider);
    return async.when(
      loading: () => ListSkeleton(
        itemCount: 4,
        itemBuilder: (_) => const JobCardSkeleton(),
      ),
      error: (e, _) => Center(child: Text('Hata: $e')),
      data: (bookings) {
        if (bookings.isEmpty) {
          return const EmptyState(
            icon: Icons.event_available_rounded,
            title: 'Randevu yok',
            message:
                'Onayladığın ya da bekleyen randevuların burada görünecek.',
          );
        }
        return mode == _ViewMode.list
            ? _ListView(bookings: bookings)
            : _CalendarView(bookings: bookings);
      },
    );
  }
}

class _ListView extends ConsumerWidget {
  final List<Booking> bookings;
  const _ListView({required this.bookings});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sorted = [...bookings]
      ..sort((a, b) => b.scheduledDate.compareTo(a.scheduledDate));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: sorted.length,
      itemBuilder: (_, i) => _bookingCard(
        sorted[i],
        onCancel: () => _showCancelSheet(context, ref, sorted[i]),
      ),
    );
  }
}

class _CalendarView extends ConsumerStatefulWidget {
  final List<Booking> bookings;
  const _CalendarView({required this.bookings});

  @override
  ConsumerState<_CalendarView> createState() => _CalendarViewState();
}

class _CalendarViewState extends ConsumerState<_CalendarView> {
  CalendarFormat _format = CalendarFormat.month;
  DateTime _focused = DateTime.now();
  DateTime? _selected;

  @override
  void initState() {
    super.initState();
    _selected = _focused;
  }

  @override
  Widget build(BuildContext context) {
    final dayBookings = widget.bookings
        .where((b) => isSameDay(b.scheduledDate, _selected))
        .toList();

    return Column(
      children: [
        TableCalendar(
          firstDay: DateTime.utc(2024, 1, 1),
          lastDay: DateTime.utc(2027, 12, 31),
          focusedDay: _focused,
          calendarFormat: _format,
          locale: 'tr_TR',
          headerStyle: const HeaderStyle(
              formatButtonVisible: true, titleCentered: true),
          selectedDayPredicate: (d) => isSameDay(_selected, d),
          eventLoader: (d) => widget.bookings
              .where((b) => isSameDay(b.scheduledDate, d))
              .toList(),
          onDaySelected: (sel, foc) {
            setState(() {
              _selected = sel;
              _focused = foc;
            });
          },
          onFormatChanged: (f) => setState(() => _format = f),
          calendarStyle: const CalendarStyle(
            todayDecoration: BoxDecoration(
                color: Colors.blueAccent, shape: BoxShape.circle),
            selectedDecoration:
                BoxDecoration(color: Colors.blue, shape: BoxShape.circle),
            markerDecoration: BoxDecoration(
                color: Colors.orange, shape: BoxShape.circle),
          ),
        ),
        const Divider(height: 1),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            children: [
              Text(
                _selected == null
                    ? ''
                    : '${_selected!.day}/${_selected!.month}/${_selected!.year}',
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('${dayBookings.length}',
                    style: const TextStyle(
                        color: Colors.blue, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
        Expanded(
          child: dayBookings.isEmpty
              ? const Center(
                  child: Text('Bu tarihte randevu yok.',
                      style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: dayBookings.length,
                  itemBuilder: (_, i) => _bookingCard(
                    dayBookings[i],
                    onCancel: () => _showCancelSheet(context, ref, dayBookings[i]),
                  ),
                ),
        ),
      ],
    );
  }
}

Widget _bookingCard(Booking b, {VoidCallback? onCancel}) {
  Color c;
  IconData ic;
  switch (b.status) {
    case BookingStatus.completed:
      c = Colors.green;
      ic = Icons.check;
      break;
    case BookingStatus.cancelled:
      c = Colors.red;
      ic = Icons.close;
      break;
    case BookingStatus.in_progress:
      c = Colors.orange;
      ic = Icons.work;
      break;
    case BookingStatus.confirmed:
      c = Colors.blue;
      ic = Icons.event_available;
      break;
    default:
      c = Colors.grey;
      ic = Icons.timer;
  }
  final canCancel = b.status == BookingStatus.pending ||
      b.status == BookingStatus.confirmed;
  return Card(
    margin: const EdgeInsets.only(bottom: 12),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    child: Padding(
      padding: const EdgeInsets.all(8),
      child: Column(
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(
                backgroundColor: c,
                child: Icon(ic, color: Colors.white, size: 18)),
            title: Text(b.category,
                style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text(b.description,
                maxLines: 1, overflow: TextOverflow.ellipsis),
            trailing: Text(b.scheduledTime ?? '--:--',
                style: const TextStyle(
                    fontWeight: FontWeight.bold, color: Colors.blue)),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: EscrowStatusBadge(bookingId: b.id),
          ),
          if (b.status == BookingStatus.in_progress)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: EscrowReleaseButton(bookingId: b.id),
            ),
          if (canCancel && onCancel != null)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onCancel,
                icon: const Icon(Icons.cancel_outlined,
                    size: 16, color: Colors.red),
                label: const Text('İptal Et',
                    style: TextStyle(color: Colors.red)),
              ),
            ),
        ],
      ),
    ),
  );
}

const _kReasonLabels = <String, String>{
  'customer_change': 'Planım değişti',
  'worker_unavailable': 'Usta müsait değil',
  'weather': 'Hava koşulları',
  'emergency': 'Acil durum',
  'other': 'Diğer',
};

void _showCancelSheet(BuildContext context, WidgetRef ref, Booking b) {
  String reason = 'customer_change';
  // 24h+ → 100% / <24h → 50% / past → 0%
  final scheduledAt = b.scheduledTime != null && b.scheduledTime!.isNotEmpty
      ? DateTime(b.scheduledDate.year, b.scheduledDate.month, b.scheduledDate.day,
          int.tryParse(b.scheduledTime!.split(':').first) ?? 12,
          int.tryParse(b.scheduledTime!.split(':').last) ?? 0)
      : DateTime(b.scheduledDate.year, b.scheduledDate.month, b.scheduledDate.day, 12);
  final diffMs = scheduledAt.difference(DateTime.now()).inMilliseconds;
  const oneDay = 24 * 60 * 60 * 1000;
  int percent;
  if (diffMs >= oneDay) {
    percent = 100;
  } else if (diffMs >= 0) {
    percent = 50;
  } else {
    percent = 0;
  }
  final price = b.agreedPrice ?? 0;
  final refundAmount = (price * percent / 100).toStringAsFixed(2);

  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setSt) => Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Randevuyu İptal Et',
                  style:
                      TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              const Text('Sebep',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: reason,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: _kReasonLabels.entries
                    .map((e) =>
                        DropdownMenuItem(value: e.key, child: Text(e.value)))
                    .toList(),
                onChanged: (v) => setSt(() => reason = v ?? 'other'),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('İade önizlemesi: %$percent',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, color: Colors.blue)),
                    const SizedBox(height: 4),
                    Text(
                      price > 0
                          ? 'Tahmini iade: $refundAmount₺'
                          : 'Anlaşmalı fiyat yok',
                      style: const TextStyle(fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      '24+ saat önce: %100 — 24 saat içinde: %50 — başlangıç sonrası: %0',
                      style: TextStyle(fontSize: 11, color: Colors.black54),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Vazgeç'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () async {
                        final navigator = Navigator.of(ctx);
                        final messenger = ScaffoldMessenger.of(context);
                        try {
                          final res = await ref
                              .read(bookingRepositoryProvider)
                              .cancelBooking(b.id, reason);
                          ref.invalidate(myCustomerBookingsProvider);
                          ref.invalidate(myWorkerBookingsProvider);
                          navigator.pop();
                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(
                                'İptal edildi. İade: ${res['refundAmount'] ?? 0}₺ (%${res['refundPercent'] ?? 0})',
                              ),
                            ),
                          );
                        } catch (e) {
                          messenger.showSnackBar(
                            SnackBar(content: Text('Hata: $e')),
                          );
                        }
                      },
                      child: const Text('İptali Onayla'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    },
  );
}
