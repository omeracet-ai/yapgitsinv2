HizmetApp
Türkiye Pazarı Hizmet Platformu
Kapsamlı Proje Dokümantasyonu — v1.0
Flutter  ·  Firebase  ·  Node.js  ·  Admin Panel
Nisan 2026

1. Yönetici Özeti
HizmetApp, Türkiye pazarı için geliştirilecek iki taraflı bir hizmet platformudur. Müşterilerin ev ve işyeri hizmetleri için kolayca profesyonel bulmasını, ustalar içinse iş geliştirme ve yönetim süreçlerini dijitalleştirmesini hedeflemektedir.
Platform; Flutter ile tek kod tabanından Android ve iOS uygulamaları, Firebase ile gerçek zamanlı bir backend ve Node.js ile esnek bir API katmanı sunacaktır.

1.1 Temel Hedefler
⦁ Müşteri ile usta arasındaki güveni artırmak
⦁ Hizmet taleplerini hızlı ve şeffaf bir süreçle yönetmek
⦁ Türkiye genelinde 7 temel kategoride hizmet vermek
⦁ Güvenli ödeme altyapısı ve derecelendirme sistemi sunmak

1.2 Başarı Kriterleri
Metrik	6. Ay Hedefi	12. Ay Hedefi
Kayıtlı Müşteri	10.000	50.000
Aktif Usta	1.000	5.000
Tamamlanan İş	5.000/ay	30.000/ay
Uygulama Puanı (Store)	≥ 4.2 / 5	≥ 4.5 / 5
NPS Skoru	≥ 40	≥ 60

2. Pazar Analizi
2.1 Türkiye Ev Hizmetleri Pazarı
Türkiye'de ev ve bina bakım hizmetleri pazarı yıllık 15-20 milyar TL büyüklüğe ulaşmış durumdadır. Ancak sektör büyük ölçüde gayri resmi kanallardan yürütülmekte; güven, şeffaflık ve kalite standardı sorunları yaşanmaktadır.

2.2 Hedef Kitle
Müşteri Segmenti
⦁ 25-50 yaş arası kentsel kullanıcılar
⦁ Teknoloji kullanımı yüksek, zaman kısıtlı profesyoneller
⦁ Ev sahipleri ve kiracılar
⦁ Küçük işletme sahipleri

Usta Segmenti
⦁ Serbest çalışan zanaatkarlar ve ustalar
⦁ Küçük taşeron şirketler
⦁ Teknik servis teknisyenleri
⦁ Temizlik şirketleri ve bireysel temizlikçiler

2.3 Rekabet Analizi
Platform	Güçlü Yön	Zayıf Yön	HizmetApp Avantajı
Armut.com	Geniş kullanıcı kitlesi	Yavaş UX, eski arayüz	Modern Flutter UI
Ustam.com	Marka bilinirliği	Sınırlı mobil deneyim	Gerçek zamanlı sohbet
Yemeksepeti (Y. Hizmet)	Dağıtım ağı	Hizmet çeşitliliği yok	Uzmanlaşmış kategoriler
Freelance Ustalar	Ucuz fiyat	Güvensizlik, belirsizlik	Doğrulanmış profil & puan

3. Müşteri Uygulaması
3.1 Genel Bakış
Müşteri uygulaması, hizmet talep eden son kullanıcılara yönelik sade ve hızlı bir deneyim sunar. Onboarding'den ödemeye kadar tüm akış 5 adımda tamamlanabilir.

3.2 Ekranlar ve Akış
Ekran	Amaç	Temel Bileşenler
Giriş / Kayıt	Kimlik doğrulama	Telefon no. + OTP, Google Sign-In
Ana Sayfa	Kategori keşfi	Kategori grid, arama, kampanyalar
Hizmet Seçimi	Kategori & alt hizmet	Liste, filtreleme, popüler seçenekler
Fotoğraf Yükleme	İş detayı aktarımı	Kamera, galeri, açıklama metin alanı
Konum Seçimi	Hizmet adresi	Google Maps, kayıtlı adresler
Teklif Alma	Fiyat karşılaştırma	Usta kartları, puan, fiyat, mesafe
Usta Profili	Güven incelemesi	Sertifikalar, yorumlar, iş görselleri
Sohbet	İletişim	Gerçek zamanlı mesaj, dosya paylaşımı
Ödeme	İşlem	Kredi kartı, havale, kapıda ödeme
Randevu	Zamanlama	Takvim seçici, hatırlatıcı
İş Geçmişi	Takip & değerlendirme	Aktif/tamamlanan işler, yorum formu

3.3 Kullanıcı Akışı
1. Uygulamayı aç → Giriş yap veya kayıt ol
2. Kategori seç (Temizlik, Elektrikçi, vb.)
3. İş tanımı yaz + fotoğraf ekle
4. Konumunu belirle veya kayıtlı adresi seç
5. Gelen teklifleri karşılaştır (fiyat, puan, mesafe)
6. Ustayı seç → Sohbet başlat
7. Randevu tarih/saat belirle
8. Hizmet tamamlanınca ödeme yap
9. Usta için puan ve yorum bırak

4. Usta Uygulaması
4.1 Genel Bakış
Usta uygulaması, iş sağlayıcılara teklif yönetiminden kazanç takibine kadar profesyonel bir iş aracı sunar. Doğrulanmış profil sistemi müşteri güvenini artırır.

4.2 Ekranlar ve Akış
Ekran	Amaç	Temel Bileşenler
Profil Oluşturma	İlk kurulum	Kişisel bilgi, uzmanlık, fotoğraf
Belge Yükleme	Doğrulama	Kimlik, sertifika, esnaf belgesi
İş Fırsatları	Talep listesi	Yakındaki iş ilanları, filtre, harita
Teklif Verme	Fiyat belirleme	Fiyat girişi, açıklama, müsaitlik
Takvim	Randevu yönetimi	Aylık/haftalık görünüm, engel saatler
Müşteri Mesajları	İletişim	Tüm konuşmalar, okunmamış sayacı
Aktif İşler	İş takibi	Durum güncelleme, fotoğraf yükleme
Kazanç Paneli	Finansal takip	Günlük/aylık gelir, bekleyen ödemeler
Yorumlar	İtibar yönetimi	Gelen değerlendirmeler, yanıt verme
Ayarlar	Hesap yönetimi	Bildirimler, servis yarıçapı, tatil modu

4.3 Doğrulama Süreci
Tüm ustalar platforma başlamadan önce 3 aşamalı doğrulama sürecinden geçer.
1. Kimlik doğrulama (T.C. Kimlik veya pasaport)
2. Uzmanlık belgesi / esnaf kaydı kontrolü
3. Admin onayı (maksimum 48 saat)

5. Hizmet Kategorileri
MVP aşamasında 7 kategori ile başlanacaktır. Her kategori için alt hizmetler, ortalama fiyat aralığı ve tahmini talep yoğunluğu aşağıda belirtilmiştir.
Kategori	Alt Hizmetler (Örnek)	Ort. Fiyat (TL)	Talep Yoğunluğu
🧹 Temizlik	Ev temizliği, ofis temizliği, derin temizlik	400 - 1.200	Çok Yüksek
🖌️ Boya Badana	İç cephe, dış cephe, dekoratif boya	800 - 5.000	Yüksek
🚚 Nakliyat	Ev taşıma, ofis taşıma, parça taşıma	600 - 8.000	Yüksek
⚡ Elektrikçi	Arıza, tesisat, priz/aydınlatma montajı	250 - 2.000	Yüksek
🔩 Su Tesisatçısı	Tıkanıklık, kaçak, banyo yenileme	300 - 3.000	Yüksek
❄️ Klima Servis	Montaj, bakım, gaz dolumu, arıza	400 - 2.500	Orta-Yüksek
🪑 Mobilya Montaj	IKEA montaj, dolap, kitaplık, bebek odası	200 - 1.500	Orta

6. Teknik Mimari
6.1 Teknoloji Yığını
Katman	Teknoloji	Açıklama
Mobil (iOS & Android)	Flutter 3.x + Dart	Tek kod tabanı, Material 3 UI
State Management	Riverpod / Bloc	Predictable state, test edilebilir yapı
Gerçek Zamanlı DB	Firebase Firestore	Anlık güncellemeler, offline desteği
Kimlik Doğrulama	Firebase Auth	OTP, Google, Apple Sign-In
Dosya Depolama	Firebase Storage	Profil fotoğrafları, iş görselleri
Push Bildirim	Firebase FCM	Teklif, mesaj, randevu bildirimleri
REST API	Node.js + Express	Ödeme entegrasyonu, iş mantığı
Ödeme	İyzico / Stripe TR	Kredi kartı, 3D Secure, sanal POS
Harita / Konum	Google Maps SDK	Adres seçimi, usta konumu
Admin Paneli	React.js (Web)	Kullanıcı yönetimi, raporlama
CI/CD	GitHub Actions	Otomatik build, test, deploy
Analytics	Firebase Analytics	Kullanıcı davranışı, funnel analizi

6.2 Firebase Veri Modeli
Koleksiyonlar
⦁ users/{userId} — Müşteri profili (ad, telefon, adresler, favori ustalar)
⦁ artisans/{artisanId} — Usta profili (hizmetler, belgeler, puan, konum)
⦁ jobs/{jobId} — İş talebi (kategori, açıklama, fotoğraflar, konum, durum)
⦁ offers/{offerId} — Teklif (jobId, artisanId, fiyat, süre, durum)
⦁ bookings/{bookingId} — Onaylanan randevu (offerId, tarih, ödeme durumu)
⦁ messages/{chatId}/messages/{msgId} — Sohbet mesajları
⦁ reviews/{reviewId} — Değerlendirme (puan, yorum, artisanId, userId)
⦁ categories/{catId} — Kategori tanımları ve alt hizmetler
⦁ notifications/{userId}/items — Kullanıcıya özel bildirimler

6.3 API Endpoint'leri (Node.js)
Endpoint	Method	Açıklama
/api/auth/verify-otp	POST	OTP doğrulama ve token üretimi
/api/jobs	POST / GET	İş talebi oluşturma ve listeleme
/api/offers/{jobId}	POST / GET	Teklife mesaj gönderme ve alma
/api/bookings	POST	Randevu oluşturma
/api/payments/initiate	POST	Ödeme başlatma (İyzico)
/api/payments/callback	POST	Ödeme sonuç webhook
/api/artisans/nearby	GET	Konum bazlı usta arama
/api/reviews	POST	Yorum ve puan gönderme
/api/admin/verify-artisan	PATCH	Usta doğrulama (Admin)
/api/admin/reports	GET	Raporlama ve istatistikler

7. Güvenlik ve Gizlilik
7.1 Kimlik Doğrulama ve Yetkilendirme
⦁ Tüm API çağrıları Firebase ID Token ile korunur
⦁ Firestore Security Rules ile veri erişimi kısıtlanır
⦁ Admin işlemleri ayrı bir service account ile yönetilir
⦁ JWT token'lar 1 saatlik, refresh token'lar 30 günlük süreye sahiptir

7.2 Ödeme Güvenliği
⦁ Kart bilgileri asla backend'de saklanmaz — tokenizasyon kullanılır
⦁ Tüm ödeme trafiği HTTPS/TLS 1.3 ile şifrelenir
⦁ 3D Secure zorunlu tutulur
⦁ PCI-DSS uyumlu ödeme sağlayıcısı (İyzico) kullanılır

7.3 KVKK Uyumu
⦁ Kullanıcı verileri yalnızca Türkiye'deki Firebase bölgesinde tutulur
⦁ Veri silme talebi 30 gün içinde işleme alınır
⦁ Açık rıza metinleri kayıt akışına entegre edilir
⦁ Veri işleme envanteri tutulur ve düzenli güncellenir

8. Proje Yol Haritası
8.1 Fazlar
Faz	Süre	Kapsam	Çıktı
Faz 0 — Hazırlık	2 Hafta	Ortam kurulumu, Firebase projesi, tasarım sistemi	Boilerplate proje, Figma dosyası
Faz 1 — MVP	8 Hafta	Çekirdek akış: kayıt, iş talebi, teklif, sohbet, ödeme	Play Store / App Store beta
Faz 2 — Büyüme	6 Hafta	Takvim, kazanç paneli, admin paneli, bildirimler	Genel yayın (Soft Launch)
Faz 3 — Olgunluk	8 Hafta	Analitik, arama iyileştirme, kategori genişleme, referans	v2.0 sürümü
Faz 4 — Ölçeklendirme	Süregelen	Şehir genişleme, kurumsal müşteriler, abonelik	Kurumsal plan

8.2 Faz 1 Sprint Planı (MVP — 8 Hafta)
Sprint	Hafta	Görevler
Sprint 1	1-2	Firebase kurulum, Auth akışı (OTP + Google), temel navigasyon
Sprint 2	3-4	Kategori seçimi, iş talebi oluşturma, fotoğraf yükleme, konum
Sprint 3	5-6	Teklif sistemi, usta arama, Firestore kuralları, sohbet ekranı
Sprint 4	7-8	Ödeme entegrasyonu, randevu, bildirimler, beta test ve düzeltme

9. Ekip ve Roller
Rol	Sorumluluk	Öneri
Flutter Geliştirici (1-2 kişi)	Müşteri ve usta uygulamaları, UI/UX entegrasyonu	Deneyimli Flutter + Firebase
Backend Geliştirici (1 kişi)	Node.js API, ödeme entegrasyonu, güvenlik	Node.js + Express + Firestore
UI/UX Tasarımcı (1 kişi)	Figma tasarımı, kullanıcı testleri, akış diyagramları	Mobil odaklı, Turkish market
Ürün Yöneticisi (1 kişi)	Sprint yönetimi, kullanıcı araştırması, önceliklendirme	B2C uygulama deneyimi
QA Mühendisi (Part-time)	Test otomasyon, regresyon, cihaz testleri	Flutter test + Firebase emulator
Growth / Pazarlama	Usta edinimi, kullanıcı büyümesi, içerik	Türkiye pazarı, performans pazarlama

10. Bütçe Tahmini (MVP)
Kalem	Aylık Maliyet (USD)	6 Ay Toplam (USD)	Notlar
Flutter Geliştirici x2	4.000	24.000	Serbest çalışan veya tam zamanlı
Backend Geliştirici x1	2.500	15.000	Node.js uzmanı
UI/UX Tasarımcı x1	1.500	9.000	Figma + kullanıcı testi
Firebase (Blaze Plan)	150	900	Gerçek trafik bazlı
Google Maps API	100	600	İlk 200$ ücretsiz/ay
İyzico Entegrasyonu	0 + %2.9 komisyon	—	Kurulum ücretsiz
App Store / Play Store	25 + 99	124	Tek seferlik + yıllık
Figma + Araçlar	45	270	Takım planı
Test Cihazları	—	500	Tek seferlik
Toplam (yaklaşık)	—	~50.400 USD	Pazarlama hariç
Firebase maliyetleri trafik hacmine göre değişkenlik gösterir. İlk 6 ayda Spark (ücretsiz) plan yeterli olabilir.

11. Risk Analizi
Risk	Olasılık	Etki	Azaltma Stratejisi
Usta ediniminde güçlük	Orta	Yüksek	Erken sahada saha satış ekibi, komisyon indirimi
Ödeme entegrasyon gecikmesi	Düşük	Yüksek	İyzico sandbox ortamı erken başlatılacak
Firebase maliyet artışı	Orta	Orta	Firestore okuma/yazma limitleri optimize edilecek
App Store / Play Store red	Düşük	Orta	Guideline'lara uygun içerik, erken inceleme talebi
Kullanıcı güvensizliği	Orta	Yüksek	Usta doğrulama, sigorta/garanti kampanyası
Teknik borç birikmesi	Orta	Orta	Code review, unit test zorunluluğu, sprint review

12. Sonuç ve Sonraki Adımlar
HizmetApp, güven eksikliği ve dijitalleşme boşluğu nedeniyle büyük fırsat barındıran Türkiye ev hizmetleri pazarına modern bir çözüm sunmaktadır. Flutter ve Firebase kombinasyonu hızlı MVP geliştirme ve düşük operasyonel maliyete imkan tanır.
Sonraki Adımlar
1. Figma tasarım dosyasını oluştur (Ana ekranlar ve akışlar)
2. Firebase projesi kur (Development + Production ortamları)
3. Flutter proje boilerplate hazırla (Klasör yapısı, Riverpod, routing)
4. Firestore veri modelini uygula ve güvenlik kurallarını yaz
5. Temizlik kategorisiyle pilot şehir testine başla (İstanbul / Ankara)
6. İlk 50 ustayı manuel olarak platforma dahil et
7. Kapalı beta ile 200 müşteri kullanıcısına aç

Bu doküman projenin tüm fazlarında güncellenerek yaşayan bir kaynak olarak kullanılmalıdır.
