import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';

class BookingStep3Address extends StatelessWidget {
  final String address;
  final String customerNote;
  final String agreedPrice;
  final ValueChanged<String> onAddressChanged;
  final ValueChanged<String> onNoteChanged;
  final ValueChanged<String> onPriceChanged;
  final String workerName;
  final String? category;
  final String? subCategory;
  final DateTime? date;
  final TimeOfDay? time;

  const BookingStep3Address({
    super.key,
    required this.address,
    required this.customerNote,
    required this.agreedPrice,
    required this.onAddressChanged,
    required this.onNoteChanged,
    required this.onPriceChanged,
    required this.workerName,
    required this.category,
    required this.subCategory,
    required this.date,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Adres & Onay',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text('Hizmet nereye verilecek?',
              style: TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 20),
          const Text('Adres *', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: address,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Mahalle, sokak, bina no, daire…',
              border: OutlineInputBorder(),
            ),
            onChanged: onAddressChanged,
          ),
          const SizedBox(height: 16),
          const Text('Anlaşılan Fiyat (opsiyonel)',
              style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: agreedPrice,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
            ],
            decoration: const InputDecoration(
              hintText: '0',
              prefixText: '₺ ',
              border: OutlineInputBorder(),
            ),
            onChanged: onPriceChanged,
          ),
          const SizedBox(height: 16),
          const Text('Müşteri Notu (opsiyonel)',
              style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: customerNote,
            minLines: 2,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'Eklemek istediğiniz notlar…',
              border: OutlineInputBorder(),
            ),
            onChanged: onNoteChanged,
          ),
          const SizedBox(height: 24),
          _SummaryCard(
            workerName: workerName,
            category: category,
            subCategory: subCategory,
            date: date,
            time: time,
            address: address,
            price: agreedPrice,
          ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String workerName;
  final String? category;
  final String? subCategory;
  final DateTime? date;
  final TimeOfDay? time;
  final String address;
  final String price;
  const _SummaryCard({
    required this.workerName,
    required this.category,
    required this.subCategory,
    required this.date,
    required this.time,
    required this.address,
    required this.price,
  });

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('d MMMM yyyy, EEEE', 'tr_TR');
    final timeStr = time == null
        ? '—'
        : '${time!.hour.toString().padLeft(2, '0')}:${time!.minute.toString().padLeft(2, '0')}';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Özet',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 10),
          _row('Usta', workerName),
          _row('Kategori',
              [category, subCategory].where((s) => s != null && s.isNotEmpty).join(' • ')),
          _row('Tarih', date == null ? '—' : df.format(date!)),
          _row('Saat', timeStr),
          _row('Adres', address.isEmpty ? '—' : address),
          if (price.isNotEmpty) _row('Fiyat', '₺$price'),
        ],
      ),
    );
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
                width: 80,
                child: Text(k,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary))),
            Expanded(
              child: Text(v.isEmpty ? '—' : v,
                  style:
                      const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );
}
