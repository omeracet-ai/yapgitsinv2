import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../../core/models/booking_model.dart';
import '../data/booking_repository.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
  }

  @override
  Widget build(BuildContext context) {
    final bookingsAsync = ref.watch(myWorkerBookingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('İş Takvimi', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(myWorkerBookingsProvider),
          )
        ],
      ),
      body: bookingsAsync.when(
        data: (bookings) {
          final selectedDayBookings = bookings.where((b) => isSameDay(b.scheduledDate, _selectedDay)).toList();

          return Column(
            children: [
              TableCalendar(
                firstDay: DateTime.utc(2024, 1, 1),
                lastDay: DateTime.utc(2026, 12, 31),
                focusedDay: _focusedDay,
                calendarFormat: _calendarFormat,
                locale: 'tr_TR',
                headerStyle: const HeaderStyle(
                  formatButtonVisible: false,
                  titleCentered: true,
                ),
                selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                eventLoader: (day) {
                  return bookings.where((b) => isSameDay(b.scheduledDate, day)).toList();
                },
                onDaySelected: (selectedDay, focusedDay) {
                  setState(() {
                    _selectedDay = selectedDay;
                    _focusedDay = focusedDay;
                  });
                },
                onFormatChanged: (format) {
                  setState(() {
                    _calendarFormat = format;
                  });
                },
                calendarStyle: const CalendarStyle(
                  todayDecoration: BoxDecoration(color: Colors.blueAccent, shape: BoxShape.circle),
                  selectedDecoration: BoxDecoration(color: Colors.blue, shape: BoxShape.circle),
                  markerDecoration: BoxDecoration(color: Colors.orange, shape: BoxShape.circle),
                ),
              ),
              const Divider(),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${_selectedDay!.day}/${_selectedDay!.month}/${_selectedDay!.year} Programı",
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      if (selectedDayBookings.isEmpty)
                        const Expanded(child: Center(child: Text("Bu tarihte planlanmış iş bulunmuyor.", style: TextStyle(color: Colors.grey))))
                      else
                        Expanded(
                          child: ListView.builder(
                            itemCount: selectedDayBookings.length,
                            itemBuilder: (context, index) {
                              final b = selectedDayBookings[index];
                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: b.status == BookingStatus.completed ? Colors.green : Colors.blue,
                                    child: Icon(
                                      b.status == BookingStatus.completed ? Icons.check : Icons.timer,
                                      color: Colors.white, size: 18,
                                    ),
                                  ),
                                  title: Text(b.category, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: Text(b.description, maxLines: 1, overflow: TextOverflow.ellipsis),
                                  trailing: Text(b.scheduledTime ?? "--:--", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                                ),
                              );
                            },
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text("Hata: $e")),
      ),
    );
  }
}
