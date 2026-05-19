import 'dart:async';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../../../core/theme/app_colors.dart';

/// Phase 254 — Worker QR display + 5dk countdown + yenile butonu.
class QrDisplayWidget extends StatefulWidget {
  final String qrToken;
  final DateTime expiresAt;
  final Future<void> Function() onRefresh;

  const QrDisplayWidget({
    super.key,
    required this.qrToken,
    required this.expiresAt,
    required this.onRefresh,
  });

  @override
  State<QrDisplayWidget> createState() => _QrDisplayWidgetState();
}

class _QrDisplayWidgetState extends State<QrDisplayWidget> {
  Timer? _tick;
  Duration _remaining = Duration.zero;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    _update();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => _update());
  }

  void _update() {
    final r = widget.expiresAt.difference(DateTime.now());
    setState(() => _remaining = r.isNegative ? Duration.zero : r);
  }

  @override
  void didUpdateWidget(covariant QrDisplayWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.expiresAt != widget.expiresAt) _update();
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  String _fmt(Duration d) {
    final m = d.inMinutes.toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _refresh() async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    try {
      await widget.onRefresh();
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final expired = _remaining == Duration.zero;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
          ),
          child: QrImageView(
            data: widget.qrToken,
            version: QrVersions.auto,
            size: 240,
            backgroundColor: Colors.white,
            // ignore: deprecated_member_use
            foregroundColor: Colors.black,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              expired ? Icons.error_outline : Icons.timer_outlined,
              size: 18,
              color: expired ? AppColors.error : AppColors.textSecondary,
            ),
            const SizedBox(width: 6),
            Text(
              expired ? 'Süresi doldu' : 'Geçerlilik: ${_fmt(_remaining)}',
              style: TextStyle(
                color: expired ? AppColors.error : AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextButton.icon(
          onPressed: _refreshing ? null : _refresh,
          icon: const Icon(Icons.refresh_rounded),
          label: Text(_refreshing ? 'Yenileniyor…' : 'Yeni QR oluştur'),
        ),
        const SizedBox(height: 8),
        const Text(
          'Müşterinin telefonuyla bu kodu okutun.\nQR 5 dakika geçerlidir.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
      ],
    );
  }
}
