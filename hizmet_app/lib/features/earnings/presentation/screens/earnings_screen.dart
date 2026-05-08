import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/earnings_repository.dart';

class EarningsScreen extends ConsumerStatefulWidget {
  const EarningsScreen({super.key});

  @override
  ConsumerState<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends ConsumerState<EarningsScreen> {
  int _months = 6;

  String _fmtTL(double v) {
    final s = v.toStringAsFixed(v.truncateToDouble() == v ? 0 : 2);
    return '$s TL';
  }

  @override
  Widget build(BuildContext context) {
    final asyncData = ref.watch(earningsProvider(_months));
    return Scaffold(
      appBar: AppBar(title: const Text('Kazançlarım')),
      body: asyncData.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (d) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(earningsProvider(_months)),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _filterRow(),
              const SizedBox(height: 12),
              _kpiGrid(d),
              const SizedBox(height: 20),
              _sectionTitle('Aylık Trend'),
              const SizedBox(height: 8),
              _monthlyChart(d.monthlySeries),
              const SizedBox(height: 20),
              _sectionTitle('Aylık Detay'),
              const SizedBox(height: 8),
              ...d.monthlySeries.reversed.map(_monthRow),
              const SizedBox(height: 20),
              _sectionTitle('En Çok Kazandıran Kategoriler'),
              const SizedBox(height: 8),
              if (d.topCategories.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Henüz veri yok', style: TextStyle(color: Colors.grey)),
                )
              else
                ...d.topCategories.map(_categoryRow),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _filterRow() {
    return SegmentedButton<int>(
      segments: const [
        ButtonSegment(value: 3, label: Text('3 Ay')),
        ButtonSegment(value: 6, label: Text('6 Ay')),
        ButtonSegment(value: 12, label: Text('12 Ay')),
        ButtonSegment(value: 24, label: Text('24 Ay')),
      ],
      selected: {_months},
      onSelectionChanged: (s) => setState(() => _months = s.first),
    );
  }

  Widget _kpiGrid(EarningsData d) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.5,
      children: [
        _kpi('Toplam Kazanç', _fmtTL(d.totalEarnings), Icons.account_balance_wallet,
            AppColors.primary),
        _kpi('Bu Ay', _fmtTL(d.thisMonthEarnings), Icons.calendar_month,
            const Color(0xFF00C9A7)),
        _kpi('Geçen Ay', _fmtTL(d.lastMonthEarnings), Icons.history, Colors.grey),
        _kpi(
          'Büyüme',
          '${d.growthPercent >= 0 ? '+' : ''}${d.growthPercent.toStringAsFixed(1)}%',
          d.growthPercent >= 0 ? Icons.trending_up : Icons.trending_down,
          d.growthPercent >= 0 ? const Color(0xFF00C9A7) : const Color(0xFFDE4437),
        ),
      ],
    );
  }

  Widget _kpi(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: color, size: 22),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          Text(value,
              style: TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w700, color: color)),
        ],
      ),
    );
  }

  Widget _sectionTitle(String t) =>
      Text(t, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700));

  Widget _monthlyChart(List<MonthlyPoint> series) {
    if (series.isEmpty) {
      return const SizedBox(height: 80, child: Center(child: Text('Veri yok')));
    }
    final maxV = series.map((m) => m.earnings).fold<double>(0, (a, b) => a > b ? a : b);
    return Container(
      height: 180,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: series.map((m) {
          final h = maxV > 0 ? (m.earnings / maxV) * 130 : 0.0;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (m.earnings > 0)
                    Text(_fmtTL(m.earnings),
                        style: const TextStyle(fontSize: 9, color: Colors.grey)),
                  const SizedBox(height: 2),
                  Container(
                    height: h,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [AppColors.primary, Color(0xFF4DA3FF)],
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(m.month.substring(5),
                      style: const TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _monthRow(MonthlyPoint m) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
      ),
      child: Row(
        children: [
          Expanded(child: Text(m.month, style: const TextStyle(fontWeight: FontWeight.w600))),
          Text('${m.count} iş',
              style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(width: 12),
          Text(_fmtTL(m.earnings),
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary)),
        ],
      ),
    );
  }

  Widget _categoryRow(CategoryEarning c) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
      ),
      child: Row(
        children: [
          const Icon(Icons.category, size: 18, color: AppColors.primary),
          const SizedBox(width: 10),
          Expanded(child: Text(c.category, style: const TextStyle(fontWeight: FontWeight.w600))),
          Text('${c.count}',
              style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(width: 12),
          Text(_fmtTL(c.earnings),
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary)),
        ],
      ),
    );
  }
}
