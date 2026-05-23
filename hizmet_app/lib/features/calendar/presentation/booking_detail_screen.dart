import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/models/booking_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../escrow/data/escrow_repository.dart'; // escrowByBookingProvider, EscrowStatus
import '../data/booking_repository.dart';

class BookingDetailScreen extends ConsumerStatefulWidget {
  final Booking booking;
  final bool asWorker;

  const BookingDetailScreen({
    super.key,
    required this.booking,
    required this.asWorker,
  });

  @override
  ConsumerState<BookingDetailScreen> createState() =>
      _BookingDetailScreenState();
}

class _BookingDetailScreenState extends ConsumerState<BookingDetailScreen> {
  bool _busy = false;

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _busy = true);
    try {
      final repo = ref.read(bookingRepositoryProvider);
      await repo.updateStatus(widget.booking.id, newStatus);
      ref.invalidate(myWorkerBookingsProvider);
      ref.invalidate(myCustomerBookingsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Durum güncellendi: $newStatus')),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Hata: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.booking;
    final dateFmt = DateFormat('d MMMM yyyy, EEEE', 'tr_TR').format(b.scheduledDate);
    final priceLabel = (b.agreedPrice != null && b.agreedPrice! > 0)
        ? '₺${b.agreedPrice!.toStringAsFixed(0)}'
        : 'Belirtilmedi';

    return Scaffold(
      appBar: AppBar(
        title: const Text('İlan Detayı',
            style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _statusChip(b.status),
            const SizedBox(height: 16),
            _section('Kategori', b.category, Icons.category_outlined),
            if (b.subCategory != null && b.subCategory!.isNotEmpty)
              _section('Alt Kategori', b.subCategory!, Icons.subdirectory_arrow_right),
            _section('Tarih', dateFmt, Icons.calendar_today_outlined),
            _section('Saat', b.scheduledTime ?? '--:--', Icons.access_time),
            _section('Adres', b.address, Icons.location_on_outlined),
            _section('Ücret', priceLabel, Icons.payments_outlined,
                emphasize: true),
            const Divider(height: 32),
            Text('Açıklama',
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textSecondary)),
            const SizedBox(height: 6),
            Text(b.description,
                style: TextStyle(
                    fontSize: 15, color: AppColors.textPrimary, height: 1.4)),
            const SizedBox(height: 24),
            if (widget.asWorker && b.status == BookingStatus.pending) ...[
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _busy ? null : () => _updateStatus('confirmed'),
                  icon: const Icon(Icons.check_circle),
                  label: const Text('Teklifi Kabul Et'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.success,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : () => _updateStatus('cancelled'),
                  icon: const Icon(Icons.close),
                  label: const Text('Reddet'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
            if (widget.asWorker &&
                b.status == BookingStatus.confirmed) ...[
              Consumer(
                builder: (context, ref, _) {
                  final escrowAsync = ref.watch(escrowByBookingProvider(b.id));
                  final held = escrowAsync.maybeWhen(
                    data: (e) => e != null && e.status == EscrowStatus.held,
                    orElse: () => false,
                  );
                  if (!held) {
                    return Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        'Müşteri ödemeyi yaptıktan sonra "İşi Başlat" butonu görünecek.',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    );
                  }
                  return SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed:
                          _busy ? null : () => _updateStatus('in_progress'),
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: const Text('İşi Başlat'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _section(String label, String value, IconData icon,
      {bool emphasize = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: emphasize ? 18 : 15,
                    fontWeight:
                        emphasize ? FontWeight.bold : FontWeight.w500,
                    color: emphasize
                        ? AppColors.primary
                        : AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(BookingStatus s) {
    String label;
    Color color;
    switch (s) {
      case BookingStatus.pending:
        label = 'Bekliyor';
        color = AppColors.warning;
        break;
      case BookingStatus.confirmed:
        label = 'Onaylandı';
        color = AppColors.primary;
        break;
      case BookingStatus.in_progress:
        label = 'İşlemde';
        color = Colors.orange;
        break;
      case BookingStatus.completed:
        label = 'Tamamlandı';
        color = AppColors.success;
        break;
      case BookingStatus.cancelled:
        label = 'İptal Edildi';
        color = AppColors.error;
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color),
      ),
      child: Text(label,
          style: TextStyle(color: color, fontWeight: FontWeight.bold)),
    );
  }
}
