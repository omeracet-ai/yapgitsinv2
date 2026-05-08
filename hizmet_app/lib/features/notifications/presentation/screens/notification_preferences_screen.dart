import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/notification_prefs_provider.dart';

class NotificationPreferencesScreen extends ConsumerWidget {
  const NotificationPreferencesScreen({super.key});

  static const _items = [
    _PrefItem('booking', 'Rezervasyon', 'Yeni randevu, onay ve iptal bildirimleri',
        Icons.event_note_outlined),
    _PrefItem('offer', 'Teklif', 'Yeni teklif, kabul/red bildirimleri',
        Icons.local_offer_outlined),
    _PrefItem('review', 'Yorum', 'Yeni değerlendirme aldığınızda',
        Icons.star_outline),
    _PrefItem('message', 'Mesaj', 'Sohbet ve doğrudan mesajlar',
        Icons.chat_bubble_outline),
    _PrefItem('system', 'Sistem', 'Duyurular, kampanyalar ve güncellemeler',
        Icons.campaign_outlined),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationPrefsProvider);
    final notifier = ref.read(notificationPrefsProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Bildirim Ayarları'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: state.loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.symmetric(vertical: 16),
              children: [
                if (state.error != null)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: Text(
                      'Hata: ${state.error}',
                      style: const TextStyle(color: Colors.redAccent),
                    ),
                  ),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextButton.icon(
                          onPressed: state.saving
                              ? null
                              : () => notifier.setAll(true),
                          icon: const Icon(Icons.notifications_active_outlined),
                          label: const Text('Tümünü Aç'),
                        ),
                      ),
                      Container(width: 1, height: 24, color: AppColors.border),
                      Expanded(
                        child: TextButton.icon(
                          onPressed: state.saving
                              ? null
                              : () => notifier.setAll(false),
                          icon: const Icon(Icons.notifications_off_outlined),
                          label: const Text('Tümünü Kapat'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      for (var i = 0; i < _items.length; i++) ...[
                        SwitchListTile(
                          value: state.prefs[_items[i].key] ?? true,
                          onChanged: state.saving
                              ? null
                              : (v) => notifier.setKey(_items[i].key, v),
                          secondary: Icon(_items[i].icon,
                              color: AppColors.textPrimary),
                          title: Text(_items[i].title,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(_items[i].subtitle,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary)),
                          activeThumbColor: AppColors.primary,
                        ),
                        if (i < _items.length - 1)
                          const Divider(height: 1, indent: 60),
                      ],
                    ],
                  ),
                ),
                if (state.saving)
                  const Padding(
                    padding: EdgeInsets.only(top: 16),
                    child: Center(
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

class _PrefItem {
  const _PrefItem(this.key, this.title, this.subtitle, this.icon);
  final String key;
  final String title;
  final String subtitle;
  final IconData icon;
}
