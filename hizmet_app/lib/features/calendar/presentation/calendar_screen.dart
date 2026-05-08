import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../../core/models/booking_model.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/list_skeleton.dart';
import '../data/booking_repository.dart';

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

class _ListView extends StatelessWidget {
  final List<Booking> bookings;
  const _ListView({required this.bookings});

  @override
  Widget build(BuildContext context) {
    final sorted = [...bookings]
      ..sort((a, b) => b.scheduledDate.compareTo(a.scheduledDate));
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: sorted.length,
      itemBuilder: (_, i) => _bookingCard(sorted[i]),
    );
  }
}

class _CalendarView extends StatefulWidget {
  final List<Booking> bookings;
  const _CalendarView({required this.bookings});

  @override
  State<_CalendarView> createState() => _CalendarViewState();
}

class _CalendarViewState extends State<_CalendarView> {
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
                  itemBuilder: (_, i) => _bookingCard(dayBookings[i]),
                ),
        ),
      ],
    );
  }
}

Widget _bookingCard(Booking b) {
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
  return Card(
    margin: const EdgeInsets.only(bottom: 12),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    child: ListTile(
      leading: CircleAvatar(
          backgroundColor: c, child: Icon(ic, color: Colors.white, size: 18)),
      title: Text(b.category,
          style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(b.description,
          maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: Text(b.scheduledTime ?? '--:--',
          style: const TextStyle(
              fontWeight: FontWeight.bold, color: Colors.blue)),
    ),
  );
}
