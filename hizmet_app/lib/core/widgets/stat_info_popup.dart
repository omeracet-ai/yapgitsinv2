import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Phase 414 — Tutarlı stat tooltip imleci + popup.
/// JobDetail Customer Card, PublicProfileScreen, ProfileScreen 3 ekran
/// aynı görünümü kullanır: küçük info ikonu → tap → başlık+açıklama
/// modali. Phase 374'te JobDetail içinde inline yazılan kalıp buraya
/// çıkarıldı ki tek kaynak olsun.
class StatInfoIcon extends StatelessWidget {
  final String title;
  final String message;
  final double size;
  final EdgeInsets padding;

  const StatInfoIcon({
    super.key,
    required this.title,
    required this.message,
    this.size = 12,
    this.padding = const EdgeInsets.all(2),
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => showStatInfoPopup(
        context: context,
        title: title,
        message: message,
      ),
      child: Padding(
        padding: padding,
        child: Icon(
          Icons.info_outline_rounded,
          size: size,
          color: AppColors.primary.withValues(alpha: 0.85),
        ),
      ),
    );
  }
}

/// Stat başlığı hakkında barrier-dismissible popup. Pencere kompakt,
/// koyu yüzey + ince mavi border, blur gölge.
void showStatInfoPopup({
  required BuildContext context,
  required String title,
  required String message,
}) {
  showDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierColor: Colors.black.withValues(alpha: 0.35),
    builder: (ctx) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => Navigator.of(ctx).pop(),
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 48),
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
              constraints: const BoxConstraints(maxWidth: 280),
              decoration: BoxDecoration(
                color: const Color(0xFF1A1F2E),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: AppColors.primary.withValues(alpha: 0.30),
                    width: 1),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.45),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline_rounded,
                          size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    message,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.78),
                      fontSize: 12,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    },
  );
}

/// Yapgitsin geneli stat açıklamaları — sade Türkçe, formül yok.
/// Her ekranda aynı metin kullanılsın; tek kaynak.
class StatTooltips {
  static const String rating =
      'Aldığı yorumlardaki yıldız ortalamasıdır. '
      '5 üzerinden hesaplanır; sadece işi tamamlanan kişiler puan verebilir.';

  static const String reviews =
      'Bu kişiye iş bittikten sonra yazılan toplam yorum sayısıdır.';

  static const String reputation =
      'Aldığı yıldızlara ve bitirdiği işlere göre hesaplanan güven puanıdır. '
      'Yüksek olması daha çok deneyim ve memnun müşteri anlamına gelir.';

  static const String completedCustomer =
      'Bu kişinin müşteri olarak başlattığı işlerden kaç tanesinin '
      'başarıyla bittiğini gösterir.';

  static const String completedWorker =
      'Bu hizmet verenin aldığı işlerden kaç tanesini başarıyla tamamladığını '
      'gösterir.';

  static const String successRate =
      'Başlatılan işlerin yüzde kaçının başarıyla bittiğini gösterir. '
      'Yüksekse anlaşmaların büyük bölümü iyi sonuçlanıyor demektir.';

  static const String successScore5 =
      '5 üzerinden başarı puanıdır. '
      '5.0 her işin bittiği, 0 hiç işin tamamlanmadığı anlamına gelir.';

  static const String hourlyRate =
      'Hizmet verenin yaklaşık saatlik ücret aralığıdır. '
      'Kesin fiyat iş kapsamına göre değişir.';

  static const String serviceRadius =
      'Hizmet verenin çalıştığı maksimum mesafe (km cinsinden).';

  static const String distance =
      'Senin bulunduğun konuma göre yaklaşık uzaklık (km).';
}
