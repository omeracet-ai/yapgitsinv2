import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import 'stat_info_popup.dart';

/// Phase 476 — Tüm uygulamada tek imleç tipi: küçük "ⓘ" → tap → kompakt
/// popup. Catalog tabanlı: yazar `InfoHint(k: 'job.budget')` der; başlık ve
/// açıklama [HintCatalog] içinden çekilir. Aynı kavram her ekranda aynı
/// metni gösterir → tutarlılık + tek noktadan güncelleme.
///
/// Yeni hint eklerken `HintCatalog._data` map'ine snake.dot key + Hint
/// objesi ekle, ekranlarda `InfoHint(k: 'segment.alan')` ile çağır.
class InfoHint extends StatelessWidget {
  final String k;
  final double size;
  final EdgeInsets padding;
  final Color? color;

  // Phase 479 — Default boyut 14 → 16 (+1 derece görünür) ve dolgun bg.
  // Renk null gelirse AppColors.primary kullanılır (her arka planda görünür).
  const InfoHint({
    super.key,
    required this.k,
    this.size = 16,
    this.padding = const EdgeInsets.all(2),
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final hint = HintCatalog.lookup(k);
    if (hint == null) {
      assert(() {
        debugPrint('[InfoHint] Bilinmeyen key: $k');
        return true;
      }());
      return const SizedBox.shrink();
    }
    final fg = color ?? AppColors.primary;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => showStatInfoPopup(
        context: context,
        title: hint.title,
        message: hint.message,
      ),
      child: Padding(
        padding: padding,
        child: Container(
          padding: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            color: fg.withValues(alpha: 0.10),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.info_outline_rounded,
            size: size,
            color: fg,
          ),
        ),
      ),
    );
  }
}

class Hint {
  final String title;
  final String message;
  const Hint(this.title, this.message);
}

/// Merkezi katalog. Bir kavram ↔ bir hint.
class HintCatalog {
  static Hint? lookup(String key) => _data[key];

  static const Map<String, Hint> _data = {
    // ── Profile / Hesap ──────────────────────────────────────────────────
    'profile.completion': Hint(
      'Profil Tamamlanma Oranı',
      'Fotoğraf, kategori, açıklama, doğrulama ve iletişim alanlarının '
          'doluluk yüzdesi. %100 olunca "Eksiksiz Profil" rozeti gelir ve '
          'arama sıralamasında üste çıkarsın.',
    ),
    'profile.token': Hint(
      'Kredi (Token) Bakiyesi',
      'Platformda teklif vermek ve bazı özelliklerden faydalanmak için '
          'kullanılır. Bir teklif 5 token tüketir. Kayıt olunca 100 token '
          'hediye edilir.',
    ),
    'profile.loyalty': Hint(
      'Sadakat Puanı',
      'Tamamlanan iş, alınan yorum ve etkinliklerden kazandığın puanlar. '
          'İlerleyen sürümlerde indirim ve özel rozetlere dönüşür.',
    ),
    'profile.identityVerified': Hint(
      'Kimlik Doğrulama',
      'Kimlik fotoğrafın admin tarafından onaylandı; "Doğrulanmış" rozet '
          've daha yüksek güvenilirlik anlamına gelir. Hizmet alanlar size '
          'daha rahat teklif yollar.',
    ),
    'profile.workerCategories': Hint(
      'Hizmet Kategorileri',
      'Hizmet veren olarak sunduğun alanlar. Birden fazla kategori '
          'ekleyebilirsin; daha fazla kategori = daha fazla görünürlük.',
    ),
    'profile.availability': Hint(
      'Müsaitlik Takvimi',
      'Haftalık olarak hangi gün/saat aralıklarında çalışabileceğini '
          'belirler. Hizmet alanlar randevu talep ederken bu çizelgeyi '
          'görür.',
    ),
    'profile.publicPreview': Hint(
      'Profil Önizleme',
      'Profilinin başkalarına nasıl göründüğünü 3. göz olarak görmek için '
          'tıkla. Düzenleme yapmadan dışarıdan görünümü kontrol edersin.',
    ),

    // ── Performans / Stat ────────────────────────────────────────────────
    'perf.reviews': Hint(
      'Aldığı Yorum',
      'Hizmet alanların bu kullanıcıya bıraktığı toplam yorum sayısı. '
          'Yüksek değer + 4.5+ ortalama = "Mükemmel" değerlendirme.',
    ),
    'perf.successRate': Hint(
      'Başarı Oranı',
      'Tamamlanan iş sayısının üstlenilen toplam işe oranı (0–10 arası). '
          '7.5+ sektör ortalamasının üstüdür.',
    ),
    'perf.servicesCount': Hint(
      'Verdiği Hizmet',
      'Eklenen hizmet kategorisi sayısı. 5+ "Çok yönlü", 3+ "Geniş", '
          '1+ "Odaklı" olarak sınıflanır.',
    ),
    'perf.badges': Hint(
      'Performans Rozetleri',
      'Üst Sıralama, Deneyimli, Yükselen Yıldız, Eksiksiz Profil, Pro / '
          'Premium Üye gibi otomatik kazanılan rozetler. Her rozete tap → '
          'kazanma kriteri.',
    ),

    // ── Anasayfa / Keşfet ────────────────────────────────────────────────
    'home.featured': Hint(
      'Öne Çıkan İlanlar',
      'Yönetici tarafından öne çıkarılan veya algoritma tarafından '
          'yüksek aktivite gösteren ilanlar. Listenin en üstünde gösterilir.',
    ),
    'home.nearby': Hint(
      'Yakındaki İşler',
      'Konum izni verdiysen, konumuna yakın açık ilanları gösterir. '
          'Yarıçap ve uzaklık km cinsindendir.',
    ),
    'home.categoryStrip': Hint(
      'Hizmet Kategorileri',
      'Platformda sunulan tüm ana hizmet alanları. Bir kategoriye tap → '
          'sadece o kategorideki ilanları görürsün.',
    ),
    'home.recentJobs': Hint(
      'Son İlanlar',
      'Son 7 günde açılan en yeni ilanlar. Hızlı teklif yapmak için '
          'iyi bir başlangıç noktası.',
    ),
    'home.aiRecommendations': Hint(
      'Senin İçin Öneriler',
      'AI tarafından, eklediğin kategorilere ve geçmiş tekliflerine göre '
          'sana özel eşleştirilen ilanlar. Liste sık sık tazelenir.',
    ),

    // ── Profile Tab 2 ────────────────────────────────────────────────────
    'profile.certifications': Hint(
      'Sertifikalarım',
      'Yüklediğin sertifika belgeleri. Admin onayından geçenler "Doğrulandı" '
          'olarak rozetlenir; profilinde gözle görünür güven artışı sağlar.',
    ),
    'profile.pastPhotos': Hint(
      'Geçmiş İşlerden Fotoğraflar',
      'Tamamladığın işlerden çekilmiş fotoğraflar. Galerinde gösterilir; '
          'hizmet alanlar kalitenizi gerçek örneklerden değerlendirir.',
    ),
    'profile.reviews': Hint(
      'Değerlendirmeler',
      'Hizmet alanların seninle çalıştıktan sonra bıraktığı yıldız + yorum. '
          'Ortalama puan profilinde ve arama sıralamasında etkilidir.',
    ),

    // ── İlan / Job ───────────────────────────────────────────────────────
    'job.title': Hint(
      'İlan Başlığı',
      'Kısa, net ve aranabilir tut. "Eski Salon Boyası" gibi 4-7 kelime '
          'ideal. Markalı ifadeler yerine ne yaptırmak istediğin yazılmalı.',
    ),
    'job.description': Hint(
      'Açıklama',
      'Detaylar bekleneni netleştirir: m², iş alanı, malzeme dahil mi, '
          'zaman aralığı vb. Net açıklama, daha doğru teklif çeker.',
    ),
    'job.budget': Hint(
      'Bütçe',
      'Beklediğin tek-fiyat. Çok düşük yazarsan iyi hizmet veren teklif '
          'vermez, çok yüksek yazarsan pazarlık zorlaşır. Piyasaya yakın '
          'tutmanı öneririz.',
    ),
    'job.dueDates': Hint(
      'Teslim Tarihi',
      'Birden fazla tarih seçebilirsin; hizmet verenler bu aralıklarda '
          'müsait olduklarını belirtir. "Esnek" seçeneği ile tarih '
          'gerektirmeyeceğini söyleyebilirsin.',
    ),
    'job.location': Hint(
      'Konum',
      'İşin yapılacağı konum. Yakındaki ustaların ilanını görmesi için '
          'mümkün olduğunca doğru gir. Adres herkese görünmez, sadece '
          'kabul edilen teklif sahibi sokak detayını alır.',
    ),
    'job.photos': Hint(
      'Fotoğraflar',
      'En fazla 5 fotoğraf yükleyebilirsin. Mevcut durum + örnek + sorunlu '
          'alan kombinasyonu en doğru teklifi çıkarır.',
    ),
    'job.videos': Hint(
      'Video',
      'En fazla 5 video. Karmaşık iş (örn. tesisat sızıntısı) için video, '
          'fotoğraftan daha çok bilgi taşır.',
    ),
    'job.status': Hint(
      'İlan Durumu',
      'Açık → Atandı (teklif kabul edildi) → Tamamlandı veya İptal Edildi. '
          'İptal sonrası ilan otomatik tekrar Açık duruma döner.',
    ),
    'job.draft': Hint(
      'Taslak',
      'Henüz yayınlanmamış ilanlar. Sadece sen görürsün. Yayınlamadan '
          'önce gözden geçirebilirsin.',
    ),
    'job.featured': Hint(
      'Öne Çıkarılmış İlan',
      'Yönetici tarafından arama listesinde üst sıraya alınmış ilanlar. '
          'Daha fazla teklif çeker.',
    ),
    'job.questions': Hint(
      'Sorular & Cevaplar',
      'Hizmet veren olarak teklif vermek istediğin ilana soru sorabilirsin '
          '(o ilana teklif vermiş olmak şarttır). Sorular herkese açıktır.',
    ),

    // ── Teklif / Offer ───────────────────────────────────────────────────
    'offer.cost': Hint(
      'Teklif Maliyeti',
      'Her teklif 5 token tüketir. Token satın alma veya günlük '
          'ödüllerden bakiyeni doldurabilirsin.',
    ),
    'offer.counter': Hint(
      'Karşı Teklif',
      'İlan sahibi teklifini değiştirip karşı teklif yapabilir; sen de '
          'kabul/red/tekrar pazarlık yapabilirsin.',
    ),
    'offer.template': Hint(
      'Hızlı Şablon',
      'Sık kullandığın teklif metinlerini şablon olarak kaydet, sonraki '
          'tekliflerde tek tuşla uygula.',
    ),

    // ── MyJobs filter ────────────────────────────────────────────────────
    'myjobs.drafts': Hint(
      'Taslaklar',
      'Henüz yayınlanmamış ilanların. Sadece sen görürsün; "Yayınla" '
          'demeden teklif gelmez.',
    ),
    'myjobs.active': Hint(
      'Aktif İlanlarım',
      '"Açık" (teklif bekliyor) veya "Devam Eden" (atandı, henüz '
          'tamamlanmadı) statüsündeki ilanların.',
    ),
    'myjobs.offers': Hint(
      'Tekliflerim',
      'Hizmet veren olarak başkalarının ilanlarına gönderdiğin teklifler. '
          'Kabul / red / pazarlık durumlarını buradan takip et.',
    ),
    'myjobs.completed': Hint(
      'Biten İşler',
      'Hem müşteri hem hizmet veren tarafı tamamlandı olarak onayladığı '
          'işler. Yorum yazma penceresi burada açılır.',
    ),
    'myjobs.closed': Hint(
      'Kapatılan',
      'İptal edilmiş veya itiraz sonucu kapatılmış ilanlar. Yeniden '
          'açabilirsin (cancel sonrası ilan auto-republish).',
    ),
    'myjobs.calendar': Hint(
      'Takvim',
      'Randevulu (booking) işlerin. Müşteriyle direkt anlaşılan, tarih + '
          'saat sabitlenmiş çalışmalar.',
    ),

    // ── Bildirimler ──────────────────────────────────────────────────────
    'notif.types': Hint(
      'Bildirim Türleri',
      'Randevu, yeni teklif, kabul/red, yorum ve sistem duyuruları. Her '
          'türü ayrı ayrı sessize alabilirsin (Ayarlar → Bildirimler).',
    ),

    // ── Genel ────────────────────────────────────────────────────────────
    'presence.signal': Hint(
      'Çevrimiçi Sinyali',
      'Sarı şimşek ⚡ animasyonlu yanıyorsa kullanıcı şu an aktif. Mat gri '
          'ise çevrimdışı. Sinyal canlı WebSocket bağlantısı üzerinden '
          'gelir.',
    ),
  };
}
