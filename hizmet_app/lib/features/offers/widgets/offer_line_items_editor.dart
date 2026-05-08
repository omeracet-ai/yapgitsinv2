import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_colors.dart';

/// Editable list of offer line items.
/// Each item map: {label: String, qty: num, unitPrice: num, total: num}
class OfferLineItemsEditor extends StatefulWidget {
  final List<Map<String, dynamic>> initialItems;
  final ValueChanged<List<Map<String, dynamic>>> onChanged;

  const OfferLineItemsEditor({
    super.key,
    this.initialItems = const [],
    required this.onChanged,
  });

  @override
  State<OfferLineItemsEditor> createState() => _OfferLineItemsEditorState();
}

class _OfferLineItemsEditorState extends State<OfferLineItemsEditor> {
  late List<_LineItemRow> _rows;

  @override
  void initState() {
    super.initState();
    _rows = widget.initialItems.map(_rowFromMap).toList();
    if (_rows.isEmpty) _rows.add(_LineItemRow.empty());
  }

  @override
  void dispose() {
    for (final r in _rows) {
      r.dispose();
    }
    super.dispose();
  }

  _LineItemRow _rowFromMap(Map<String, dynamic> m) {
    final row = _LineItemRow.empty();
    row.labelCtrl.text = (m['label'] ?? '').toString();
    final qty = (m['qty'] is num) ? (m['qty'] as num) : num.tryParse('${m['qty']}') ?? 1;
    final unit = (m['unitPrice'] is num) ? (m['unitPrice'] as num) : num.tryParse('${m['unitPrice']}') ?? 0;
    row.qtyCtrl.text = qty.toString();
    row.unitPriceCtrl.text = unit.toString();
    return row;
  }

  void _emit() {
    final items = _rows.map((r) => r.toMap()).toList();
    widget.onChanged(items);
  }

  double get _grandTotal =>
      _rows.fold(0.0, (sum, r) => sum + r.total);

  void _addRow() {
    setState(() => _rows.add(_LineItemRow.empty()));
    _emit();
  }

  void _removeRow(int i) {
    setState(() {
      _rows[i].dispose();
      _rows.removeAt(i);
      if (_rows.isEmpty) _rows.add(_LineItemRow.empty());
    });
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ...List.generate(_rows.length, (i) {
          final row = _rows[i];
          return Card(
            margin: const EdgeInsets.symmetric(vertical: 6),
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: AppColors.primary.withValues(alpha: 0.15)),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 4, 8),
              child: Column(
                children: [
                  TextField(
                    controller: row.labelCtrl,
                    onChanged: (_) {
                      setState(() {});
                      _emit();
                    },
                    decoration: const InputDecoration(
                      labelText: 'Kalem',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: TextField(
                          controller: row.qtyCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                          onChanged: (_) {
                            setState(() {});
                            _emit();
                          },
                          decoration: const InputDecoration(
                            labelText: 'Adet',
                            isDense: true,
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        flex: 3,
                        child: TextField(
                          controller: row.unitPriceCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                          onChanged: (_) {
                            setState(() {});
                            _emit();
                          },
                          decoration: const InputDecoration(
                            labelText: 'Birim ₺',
                            isDense: true,
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        flex: 3,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.06),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '₺${row.total.toStringAsFixed(2)}',
                            textAlign: TextAlign.right,
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppColors.error),
                        tooltip: 'Sil',
                        onPressed: () => _removeRow(i),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
        const SizedBox(height: 4),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _addRow,
            icon: const Icon(Icons.add, color: AppColors.primary),
            label: const Text('Kalem Ekle',
                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
        ),
        Container(
          margin: const EdgeInsets.only(top: 4),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Σ Toplam',
                  style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              Text('₺${_grandTotal.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 16)),
            ],
          ),
        ),
      ],
    );
  }
}

class _LineItemRow {
  final TextEditingController labelCtrl;
  final TextEditingController qtyCtrl;
  final TextEditingController unitPriceCtrl;

  _LineItemRow.empty()
      : labelCtrl = TextEditingController(),
        qtyCtrl = TextEditingController(text: '1'),
        unitPriceCtrl = TextEditingController(text: '0');

  double get qty => double.tryParse(qtyCtrl.text.replaceAll(',', '.')) ?? 0;
  double get unitPrice => double.tryParse(unitPriceCtrl.text.replaceAll(',', '.')) ?? 0;
  double get total => qty * unitPrice;

  Map<String, dynamic> toMap() => {
        'label': labelCtrl.text.trim(),
        'qty': qty,
        'unitPrice': unitPrice,
        'total': total,
      };

  void dispose() {
    labelCtrl.dispose();
    qtyCtrl.dispose();
    unitPriceCtrl.dispose();
  }
}
