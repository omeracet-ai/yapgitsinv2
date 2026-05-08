import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_colors.dart';
import '../data/statement_repository.dart';

const _months = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

class StatementScreen extends ConsumerStatefulWidget {
  const StatementScreen({super.key});

  @override
  ConsumerState<StatementScreen> createState() => _StatementScreenState();
}

class _StatementScreenState extends ConsumerState<StatementScreen> {
  late int year;
  late int month;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    year = now.year;
    month = now.month;
  }

  void _shift(int delta) {
    setState(() {
      var m = month + delta;
      var y = year;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      month = m;
      year = y;
    });
  }

  String _fmt(num? v) {
    if (v == null) return '0 ₺';
    return '${v.toStringAsFixed(2)} ₺';
  }

  Future<void> _downloadCsv() async {
    final repo = ref.read(statementRepoProvider);
    final url = repo.getMonthlyCsvUrl(year, month);
    final uri = Uri.parse(url);
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Açılamadı: $url')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncData = ref.watch(statementProvider((year: year, month: month)));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Aylık Beyan'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          _buildPeriodPicker(),
          Expanded(
            child: asyncData.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('$e', textAlign: TextAlign.center),
                ),
              ),
              data: (d) => _buildContent(d),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodPicker() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => _shift(-1),
          ),
          Expanded(
            child: Center(
              child: Text(
                '${_months[month - 1]} $year',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () => _shift(1),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(Map<String, dynamic> d) {
    final asCustomer = (d['asCustomer'] as Map?) ?? {};
    final asTasker = (d['asTasker'] as Map?) ?? {};
    final lineItems = (d['lineItems'] as List?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(
              child: _summaryCard(
                title: 'Müşteri',
                color: AppColors.primary,
                lines: [
                  '${asCustomer['count'] ?? 0} iş',
                  _fmt((asCustomer['totalSpent'] as num?)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _summaryCard(
                title: 'Usta',
                color: AppColors.success,
                lines: [
                  '${asTasker['count'] ?? 0} iş',
                  _fmt((asTasker['totalNet'] as num?)),
                ],
                subtitle:
                    'Brüt: ${_fmt(asTasker['totalGross'] as num?)} / Komisyon: ${_fmt(asTasker['totalCommission'] as num?)}',
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.download),
            label: const Text('CSV İndir'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: _downloadCsv,
          ),
        ),
        const SizedBox(height: 24),
        const Text('İşlemler',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (lineItems.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: Text('Bu ay işlem yok.')),
          )
        else
          ...lineItems.map((it) => _lineItemCard(it as Map)),
      ],
    );
  }

  Widget _summaryCard({
    required String title,
    required Color color,
    required List<String> lines,
    String? subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(
                  color: color, fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 8),
          Text(lines[0],
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 2),
          Text(lines[1],
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(subtitle,
                style: const TextStyle(fontSize: 11, color: AppColors.textHint)),
          ],
        ],
      ),
    );
  }

  Widget _lineItemCard(Map it) {
    final role = (it['role'] ?? '').toString();
    final isCustomer = role == 'customer';
    final amount = (it['amount'] as num?) ?? 0;
    final net = (it['net'] as num?) ?? amount;
    final date = (it['date'] ?? '').toString();
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: (isCustomer ? AppColors.primary : AppColors.success)
                    .withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                isCustomer ? 'Müşteri' : 'Usta',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isCustomer ? AppColors.primary : AppColors.success,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(date,
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text('İş: ${(it['jobId'] ?? '-').toString()}',
              style: const TextStyle(fontSize: 11, color: AppColors.textHint)),
        ),
        trailing: Text(
          isCustomer ? _fmt(amount) : _fmt(net),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
