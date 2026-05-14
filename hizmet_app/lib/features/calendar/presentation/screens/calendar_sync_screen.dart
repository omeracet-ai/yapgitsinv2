import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../../core/constants/api_constants.dart';
import '../../data/calendar_sync_repository.dart';

/// Phase 155 — Worker Calendar Sync screen.
/// Universal ICS feed URL — user pastes into Google/Apple/Outlook calendar.
class CalendarSyncScreen extends ConsumerStatefulWidget {
  const CalendarSyncScreen({super.key});

  @override
  ConsumerState<CalendarSyncScreen> createState() => _CalendarSyncScreenState();
}

class _CalendarSyncScreenState extends ConsumerState<CalendarSyncScreen> {
  String? _calendarUrl;
  bool _busy = false;
  String? _error;

  Future<void> _enable() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repo = ref.read(calendarSyncRepositoryProvider);
      final res = await repo.enableCalendar();
      if (!mounted) return;
      setState(() => _calendarUrl = res.calendarUrl);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Etkinleştirme başarısız: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _regenerate() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Linki yenile'),
        content: const Text(
          'Eski takvim linki kırılır ve mevcut abonelikler çalışmaz. Devam edilsin mi?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Vazgeç')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yenile')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repo = ref.read(calendarSyncRepositoryProvider);
      final res = await repo.regenerateCalendarToken();
      if (!mounted) return;
      setState(() => _calendarUrl = res.calendarUrl);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Yenileme başarısız: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _disable() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Senkronizasyonu kapat'),
        content: const Text('Takvim senkronizasyonu kapatılacak ve abonelikleriniz kırılacak. Onaylıyor musunuz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Vazgeç')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Kapat')),
        ],
      ),
    );
    if (ok != true) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repo = ref.read(calendarSyncRepositoryProvider);
      await repo.disableCalendar();
      if (!mounted) return;
      setState(() => _calendarUrl = null);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Kapatma başarısız: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _copy() async {
    final url = _calendarUrl;
    if (url == null) return;
    await Clipboard.setData(ClipboardData(text: url));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Link panoya kopyalandı')),
    );
  }

  Future<void> _share() async {
    final url = _calendarUrl;
    if (url == null) return;
    await SharePlus.instance.share(
      ShareParams(text: url, subject: 'Yapgitsin Takvim Linki'),
    );
  }

  /// Phase 207 — Download/open worker's bookings as .ics export.
  Future<void> _downloadIcs() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'auth_token');
    final base = ApiConstants.baseUrl;
    final exportUrl = '$base/bookings/export/ics${token != null ? '?token=$token' : ''}';
    final uri = Uri.parse(exportUrl);
    if (kIsWeb) {
      await launchUrl(uri);
    } else {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('İndirme açılamadı')),
        );
      }
    }
  }

  Widget _instructionTile(IconData icon, String title, String body) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(body, style: const TextStyle(fontSize: 13, height: 1.35)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final url = _calendarUrl;
    return Scaffold(
      appBar: AppBar(title: const Text('Takvim Senkronizasyonu')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            const Text(
              'Randevularınızı Google, Apple veya Outlook takvimlerinizde otomatik görün. Linki etkinleştirin ve takvim uygulamanıza abone olun.',
              style: TextStyle(fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 20),
            if (url == null) ...[
              FilledButton.icon(
                onPressed: _busy ? null : _enable,
                icon: const Icon(Icons.calendar_month),
                label: const Text('Senkronizasyonu Etkinleştir'),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Takvim Aboneliği Linki',
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    const SizedBox(height: 6),
                    SelectableText(url, style: const TextStyle(fontSize: 12, color: Colors.black87)),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _busy ? null : _copy,
                      icon: const Icon(Icons.copy, size: 18),
                      label: const Text('Kopyala'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _busy ? null : _share,
                      icon: const Icon(Icons.share, size: 18),
                      label: const Text('Paylaş'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _busy ? null : _downloadIcs,
                icon: const Icon(Icons.download_rounded, size: 18),
                label: const Text('Takvime Ekle (.ics İndir)'),
              ),
              const SizedBox(height: 24),
              const Text('Nasıl Eklenir?',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              _instructionTile(
                Icons.event,
                'Google Calendar',
                'calendar.google.com → "Diğer takvimler" yanındaki + → "URL\'den abone ol" → linki yapıştır.',
              ),
              _instructionTile(
                Icons.apple,
                'Apple Calendar',
                'Mac: Dosya → Yeni Takvim Aboneliği → linki yapıştır. iPhone: Ayarlar → Takvim → Hesaplar → Hesap Ekle → Diğer → Takvim Aboneliği Ekle.',
              ),
              _instructionTile(
                Icons.mail_outline,
                'Outlook',
                'Outlook.com → Takvim → Takvim Ekle → "Web\'den abone ol" → linki yapıştır.',
              ),
              const SizedBox(height: 12),
              const Text(
                'Not: Takvim uygulamaları genellikle saatte bir kez senkronize eder. Yeni randevularınızın görünmesi 1 saate kadar sürebilir.',
                style: TextStyle(fontSize: 12, color: Colors.black54, height: 1.4),
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: _busy ? null : _regenerate,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Linki Yenile (eski link kırılır)'),
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: _busy ? null : _disable,
                icon: const Icon(Icons.link_off, size: 18, color: Colors.red),
                label: const Text('Senkronizasyonu Kapat',
                    style: TextStyle(color: Colors.red)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
