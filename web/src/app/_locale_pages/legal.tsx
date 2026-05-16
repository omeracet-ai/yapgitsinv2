import Link from 'next/link';
import { jsonLd, breadcrumbLD } from '@/lib/seo';
import { getDict, localePath, type Locale } from '@/i18n';

export type LegalKey = 'kvkk' | 'kullanim-kosullari' | 'gizlilik-politikasi' | 'cerez-politikasi';

type Section = { h: string; p: string[] };
type LegalDoc = { title: string; intro: string; sections: Section[]; contactLine: string; updatedLabel: string; reviewBanner?: string };

const LAST_UPDATED = '2026-05-17';
const LEGAL_EMAIL = 'legal@yapgitsin.tr';
const PRIVACY_EMAIL = 'privacy@yapgitsin.tr';
const SUPPORT_EMAIL = 'support@yapgitsin.tr';

const CONTENT: Record<Locale, Record<LegalKey, LegalDoc>> = {
  tr: {
    'kvkk': {
      title: 'KVKK Aydınlatma Metni',
      intro: '6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, Yapgitsin platformu olarak veri sorumlusu sıfatıyla işlenen kişisel verileriniz hakkında sizleri bilgilendirmek isteriz.',
      sections: [
        { h: 'Veri Sorumlusu', p: ['Yapgitsin Bilişim Hizmetleri A.Ş. veri sorumlusu sıfatıyla hareket etmektedir.', 'Kayıtlı adres ve iletişim bilgileri için aşağıdaki iletişim kanallarını kullanabilirsiniz.'] },
        { h: 'İşlenen Kişisel Veriler', p: ['Ad, soyad, telefon, e-posta, adres, kimlik fotoğrafı, konum verisi gibi kategorilerde veri işlenebilir.', 'Hizmet eşleştirme amacıyla iş geçmişi, değerlendirmeler ve mesajlar saklanır.'] },
        { h: 'İşleme Amaçları', p: ['Hizmet sunumu, kullanıcı doğrulama, ödeme işlemleri, müşteri destek hizmetleri, yasal yükümlülüklerin yerine getirilmesi.', 'Pazarlama ve analitik amaçlı sınırlı veriler ayrı onay alınarak işlenir.'] },
        { h: 'Aktarım', p: ['Veriler, ödeme sağlayıcıları, hosting hizmetleri ve yasal merciler ile gerektiğinde paylaşılabilir.', 'Yurt dışı aktarımlar KVKK madde 9 kapsamında gerçekleştirilir.'] },
        { h: 'Saklama Süresi', p: ['Kişisel veriler işleme amacı ortadan kalktığında veya yasal saklama süresi dolduğunda silinir veya anonim hale getirilir.'] },
        { h: 'Haklarınız', p: ['KVKK madde 11 kapsamında verilerinize erişme, düzeltme, silme, itiraz etme haklarına sahipsiniz.', 'Başvurularınızı aşağıdaki iletişim kanalı üzerinden iletebilirsiniz.'] },
        { h: 'İletişim', p: ['Veri sorumlusuna başvurularınız için: ' + LEGAL_EMAIL] },
      ],
      contactLine: 'Sorularınız için: ' + LEGAL_EMAIL,
      updatedLabel: 'Son Güncelleme',
    },
    'kullanim-kosullari': {
      title: 'Kullanım Koşulları',
      intro: 'Yapgitsin platformunu (web ve mobil uygulama) kullanırken aşağıdaki koşulları kabul etmiş sayılırsınız. Lütfen dikkatlice okuyunuz.',
      sections: [
        { h: '1. Hizmetin Tanımı', p: ['Yapgitsin, hizmet arayan müşterileri ve hizmet veren ustaları (servis sağlayıcıları) buluşturan bir teknoloji platformudur.', 'Platform; tarafların arasındaki hizmet sözleşmesinin tarafı değildir, yalnızca aracılık eder.'] },
        { h: '2. Üyelik Koşulları', p: ['Üye olabilmek için 18 yaşını doldurmuş olmanız gerekir. Üyelik sırasında doğru, güncel ve eksiksiz bilgi vermekle yükümlüsünüz.', 'Hesabınızın güvenliği (şifre, Google oturumu) tamamen sizin sorumluluğunuzdadır.'] },
        { h: '3. Kullanıcı Yükümlülükleri', p: [
          'Türkiye Cumhuriyeti yasalarına, genel ahlak kurallarına ve Yapgitsin politikalarına uyacaksınız.',
          'Sahte ilan, dolandırıcılık, taciz, nefret söylemi, telif hakkı ihlali veya yanıltıcı içerik yayınlamak yasaktır.',
          'Platform dışı iletişim yoluyla komisyon kaçırma girişimi tespit edilirse hesap askıya alınır.',
        ] },
        { h: '4. İçerik Politikası', p: ['İlan başlıkları, açıklamaları, yüklenen fotoğraflar ve mesajlar; yasalara uygun, gerçek ve hizmetle ilgili olmalıdır. Yapgitsin uygunsuz içeriği önceden bildirim yapmaksızın kaldırma hakkını saklı tutar.'] },
        { h: '5. Ödeme, Komisyon ve Token Sistemi', p: [
          'Ustalar müşterilere teklif vermek için token bakiyesi kullanır. Token satın alımları, dijital içerik olarak kabul edildiğinden 6502 sayılı Tüketicinin Korunması Hakkında Kanun madde 15/1-ğ uyarınca cayma hakkı dışındadır; kullanılmamış tokenlar için iade talepleri istisnai olarak değerlendirilir.',
          'Yapgitsin, gerçekleşen iş üzerinden komisyon alabilir; oranlar uygulama içinde duyurulur.',
        ] },
        { h: '6. Anlaşmazlık Çözümü', p: ['Müşteri ile usta arasındaki anlaşmazlıklarda Yapgitsin destek ekibi taraflar arasında arabuluculuk yapar. Çözüm sağlanamadığında resmi mercilere başvuru hakkı saklıdır.'] },
        { h: '7. Hesabın Askıya Alınması ve Kapatılması', p: ['Koşullara aykırı kullanım, sahtecilik veya tekrar eden şikayet halinde Yapgitsin hesabınızı askıya alabilir veya kapatabilir. Siz de istediğiniz zaman hesabınızı silebilirsiniz.'] },
        { h: '8. Sorumluluk Sınırlaması', p: ['Yapgitsin, taraflar arasında verilen hizmetin kalitesi, zamanında tamamlanması veya sonuçlarından doğrudan sorumlu değildir. Platformun kesintisiz çalışacağı garanti edilmez.', 'Sorumluluk, yürürlükteki hukukun izin verdiği azami sınırlar dahilinde geçerlidir.'] },
        { h: '9. Fikri Mülkiyet', p: ['Yapgitsin markası, logosu, yazılım kodu ve tasarımı Yapgitsin\'e aittir. Kullanıcı tarafından yüklenen içeriklerin kullanım hakları kullanıcıya ait olmakla birlikte, platformda yayınlanması için Yapgitsin\'e gayri münhasır kullanım lisansı verilmiş sayılır.'] },
        { h: '10. Geçerli Hukuk ve Yetki', p: ['İşbu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul Anadolu Mahkemeleri ve İcra Daireleri yetkilidir.'] },
        { h: '11. Koşullarda Değişiklik', p: ['Yapgitsin bu koşulları gerektiğinde güncelleyebilir; önemli değişiklikler uygulama içi bildirim veya e-posta ile duyurulur.'] },
        { h: '12. İletişim', p: ['Sorularınız için: ' + SUPPORT_EMAIL] },
      ],
      contactLine: 'Sorularınız için: ' + SUPPORT_EMAIL,
      updatedLabel: 'Son Güncelleme',
    },
    'gizlilik-politikasi': {
      title: 'Gizlilik Politikası',
      intro: 'Yapgitsin olarak kullanıcı gizliliğini ön planda tutuyoruz. Bu politika; web sitemiz (yapgitsin.tr) ve mobil uygulamamız üzerinden hangi verileri topladığımızı, nasıl işlediğimizi, kimlerle paylaştığımızı ve haklarınızı açıklar.',
      sections: [
        { h: '1. Veri Sorumlusu', p: ['Yapgitsin Bilişim Hizmetleri — bu politika kapsamında veri sorumlusudur.', 'Gizlilik ve KVKK başvuruları: ' + PRIVACY_EMAIL, 'Genel destek: ' + SUPPORT_EMAIL] },
        { h: '2. Topladığımız Veriler', p: [
          'Hesap bilgileri: e-posta, parola hash, ad-soyad, telefon (opsiyonel). Google ile giriş yaparsanız: Google görünen adı, profil fotoğrafı, e-posta adresi.',
          'Profil verileri: usta veya müşteri profili; biyografi, hizmet kategorisi, deneyim, portföy fotoğrafları.',
          'İlan içeriği: ilan başlığı, açıklama, kategori, fotoğraflar, bütçe aralığı.',
          'Konum: ilan oluştururken cihazın Geolocator API\'si üzerinden alınan enlem/boylam. Hassasiyetinizi korumak için konumunuz harita üzerinde yaklaşık (locationApprox) olarak gösterilir.',
          'Cihaz bilgisi: Firebase Cloud Messaging push bildirim tokenı, cihaz dili, işletim sistemi sürümü, uygulama sürümü.',
          'Mesajlaşma: kullanıcılar arası sohbet metinleri, sesli mesajlar ve gönderim zaman damgaları.',
          'İşlem kayıtları: token satın alma kayıtları, komisyon işlemleri (kart bilgileri ödeme sağlayıcısında tutulur, biz saklamayız).',
          'Web kullanımı: çerezler aracılığıyla sayfa görüntülemeleri ve arama sorguları (detaylar Çerez Politikası\'nda).',
        ] },
        { h: '3. Cihaz İzinleri (Kamera, Mikrofon, Konum)', p: [
          'Kamera (CAMERA): Profil fotoğrafı, iş/ilan fotoğrafı yükleme ve kimlik doğrulama amacıyla kullanılır. Yalnızca fotoğraf butonuna dokunduğunuzda etkinleşir; arka planda kamera erişimi yapılmaz. Çekilen fotoğraflar şifreli bağlantı (HTTPS / TLS 1.2+) üzerinden Yapgitsin sunucularına (/uploads dizini) yüklenir ve siz fotoğrafı kaldırdığınızda veya hesabınızı sildiğinizde silinir.',
          'Mikrofon (RECORD_AUDIO): Yalnızca sohbet ekranındaki sesli mesaj kayıt düğmesine bastığınızda aktif olur. Ses dosyaları TLS üzerinden Yapgitsin sunucularına yüklenir; karşı taraf tarafından dinlendikten sonra sunucuda saklanır ve hesabınızın silinmesi durumunda kalıcı olarak silinir. Arka planda dinleme yapılmaz.',
          'Konum (ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION): Yalnızca ilan oluşturma veya yakın hizmet arama gibi açık kullanıcı eyleminde, ön planda kullanılır. Konumunuz harita üzerinde yaklaşık (locationApprox) olarak gösterilir.',
          'Bildirim (POST_NOTIFICATIONS): Yeni teklif, mesaj ve ödeme onayı bildirimleri için kullanılır.',
        ] },
        { h: '4. Veri İşleme Amaçları', p: [
          'Hesap oluşturma ve kimlik doğrulama (Firebase Auth + Yapgitsin Auth Service).',
          'Müşteri-usta eşleştirmesi, ilan listeleme, arama sonuçlarının kişiselleştirilmesi.',
          'Ödeme ve token işlemlerinin gerçekleştirilmesi (iyzipay/iyzico üzerinden).',
          'Anlık bildirim gönderimi (yeni teklif, mesaj, ödeme onayı) — FCM aracılığıyla.',
          'Müşteri destek hizmetleri ve şikayetlerin çözümü.',
          'Güvenlik, dolandırıcılık ve kötüye kullanım tespiti.',
          'Yasal yükümlülüklerin yerine getirilmesi.',
        ] },
        { h: '5. Veri Saklama Süresi', p: [
          'Kişisel verileriniz hesabınız aktif olduğu sürece saklanır.',
          'Hesabınızı sildiğinizde profil verileriniz silinir; ancak mali ve ticari işlem kayıtları (token alımı, komisyon faturaları, ödeme makbuzları) Vergi Usul Kanunu ve Türk Borçlar Kanunu uyarınca 10 yıl süreyle saklanır.',
          'Mesajlaşma kayıtları, uyuşmazlık çözüm süresi (genel zamanaşımı 2-10 yıl) sonunda silinir.',
          'Yüklediğiniz fotoğraf ve sesli mesajlar; ilgili ilan/sohbet silindiğinde veya hesabınız kapatıldığında sunucudan kalıcı olarak silinir.',
        ] },
        { h: '6. Üçüncü Taraflar ve Veri Aktarımı', p: [
          'Firebase / Google Cloud (Google LLC): Auth, Firestore (eski veriler), Cloud Messaging (FCM), Storage, Hosting — altyapı ve push bildirim sağlayıcısı. Veriler Google sunucularında işlenir; uluslararası aktarım söz konusudur.',
          'iyzipay / iyzico (iyzi Ödeme ve Elektronik Para Hizmetleri A.Ş.): Yapgitsin ödeme altyapısı sağlayıcısıdır. Token satın alımı sırasında ad, soyad, e-posta, işlem tutarı ve sepet kimliği (basketId) bilgisi iyzipay\'e aktarılır. Kart numarası, son kullanma tarihi ve CVV gibi kart verileri doğrudan iyzipay tarafından PCI-DSS uyumlu altyapı üzerinde tokenize edilir; bu veriler hiçbir zaman Yapgitsin sunucularına ulaşmaz veya saklanmaz. iyzipay\'in gizlilik politikası: https://www.iyzico.com/gizlilik-politikasi. Saklama süresi iyzipay\'in kendi politikası ve Türk vergi mevzuatına (10 yıl) tabidir.',
          'Apple Push Notification Service: iOS cihazlara push bildirim iletimi için.',
          'Yapay Zeka sağlayıcıları (opsiyonel — bkz. madde 7): Google (Gemini API) ve Anthropic (Claude API).',
          'Yasal merciler: mahkeme, savcılık veya yetkili kurumların talebi üzerine yasal sınırlar dahilinde paylaşım yapılır.',
          'Reklam veya satış amacıyla üçüncü taraflarla veri paylaşmıyoruz.',
        ] },
        { h: '7. Yapay Zeka (AI) Sohbet Özellikleri', p: [
          'Yapgitsin uygulaması içinde, kullanıcının açık tercihiyle kullanılabilen yapay zeka asistanı özellikleri bulunmaktadır. Bu özellikler iki sağlayıcıdan birini kullanır: Google Gemini API (Google LLC) veya Anthropic Claude API (Anthropic, PBC).',
          'Yalnızca yapay zeka sohbet özelliğini açıkça kullandığınızda; gönderdiğiniz mesaj içeriği ve gerekli minimum bağlam (örn. son birkaç mesaj) ilgili sağlayıcının API\'sine iletilir. Hesap bilgileriniz, telefon numaranız, ödeme verileriniz veya konumunuz AI sağlayıcılara gönderilmez.',
          'Sağlayıcıların kurumsal API politikalarına göre, API üzerinden iletilen içerikler model eğitimi için kullanılmaz.',
          'AI sohbet içerikleri diğer Yapgitsin kullanıcılarıyla paylaşılmaz.',
          'Yapay zeka özelliklerini kullanmak zorunlu değildir; standart mesajlaşma ve hizmet özellikleri AI olmadan tam işlevsel çalışır. Bu özellikler bazı sürümlerde geçici olarak devre dışı bırakılabilir; durum değişikliği uygulama içinde duyurulur.',
        ] },
        { h: '8. Çerezler', p: ['Web sitemizde oturum çerezleri (Firebase Auth), tercih çerezleri ve sınırlı analitik çerez kullanılmaktadır. Detay için Çerez Politikası sayfamızı inceleyebilirsiniz.'] },
        { h: '9. KVKK Kapsamındaki Haklarınız', p: [
          'KVKK madde 11 uyarınca: verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını öğrenme, yurt içi/yurt dışı aktarıldığı tarafları bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, silinmesini veya anonimleştirilmesini isteme, düzeltme/silme işlemlerinin aktarılan taraflara bildirilmesini isteme, otomatik analiz sonucu aleyhinize çıkan sonuca itiraz etme, zarar uğramanız halinde tazminat talep etme haklarına sahipsiniz.',
          'Bu hakları kullanmak için ' + PRIVACY_EMAIL + ' adresine başvurabilirsiniz; başvurunuz en geç 30 gün içinde sonuçlandırılır.',
          'Hesap silme talebinizi uygulama içinden de iletebilirsiniz (Ayarlar → Hesabı Sil).',
        ] },
        { h: '10. Çocukların Verisi', p: [
          'Yapgitsin ticari hizmet platformu olduğundan, kullanım yaş sınırı 18\'dir.',
          'Bilerek 13 yaşın altındaki çocuklardan kişisel veri toplamayız (COPPA prensibine uyumlu). 13-18 yaş aralığındaki kullanıcılardan da bilerek veri toplamayız; tespit edilmesi durumunda hesap kapatılır ve veri silinir.',
          'Çocuğunuza ait bir hesabın açıldığını düşünüyorsanız ' + PRIVACY_EMAIL + ' adresine bildirim göndermenizi rica ederiz; hesabı derhal kapatır ve verileri sileriz.',
        ] },
        { h: '11. Veri Güvenliği ve Şifreleme', p: [
          'Tüm istemci-sunucu iletişimi HTTPS / TLS 1.2+ üzerinden şifrelenir.',
          'Parolalar bcrypt algoritmasıyla tek yönlü hash\'lenir; düz metin parola hiçbir yerde saklanmaz.',
          'Oturum yönetimi JWT (JSON Web Token) tabanlıdır. Mobil uygulamada JWT tokenları, cihazın güvenli alanında (Android Keystore / iOS Keychain) "SecureTokenStore" üzerinden saklanır.',
          'Ödeme verileri iyzipay tarafından tokenize edilir; kart bilgisi (PAN, CVV, son kullanma tarihi) Yapgitsin sunucularına hiçbir zaman ulaşmaz ve saklanmaz.',
          'Veri tabanı yedeklemeleri şifreli olarak saklanır. Sunucu erişimi rol bazlı (RBAC) yetkilendirme ve en az ayrıcalık prensibi ile sınırlandırılmıştır; tüm erişimler loglanır.',
          'Hesabınız üzerinde olağandışı bir giriş veya işlem tespit edildiğinde, güvenlik bildirimi alırsınız.',
        ] },
        { h: '12. Politika Değişiklikleri', p: ['Bu politika güncellenebilir. Önemli değişiklikler uygulama içi bildirim veya e-posta ile size duyurulur. Politikanın güncel versiyonu daima bu sayfada yayınlanır.'] },
        { h: '13. Veri Sorumlusu İletişim', p: [
          'Veri sorumlusu: Yapgitsin Bilişim Hizmetleri',
          'Gizlilik ve KVKK başvuruları: ' + PRIVACY_EMAIL,
          'Hukuki yazışmalar: ' + LEGAL_EMAIL,
          'Genel destek: ' + SUPPORT_EMAIL,
        ] },
      ],
      contactLine: 'Gizlilik soruları için: ' + PRIVACY_EMAIL,
      updatedLabel: 'Son Güncelleme',
    },
    'cerez-politikasi': {
      title: 'Çerez Politikası',
      intro: 'Yapgitsin, kullanıcı deneyimini iyileştirmek için çerezler (cookies) kullanmaktadır.',
      sections: [
        { h: 'Çerez Nedir', p: ['Çerezler, ziyaret ettiğiniz web sitelerinin tarayıcınızda sakladığı küçük metin dosyalarıdır.'] },
        { h: 'Kullandığımız Çerez Türleri', p: ['Zorunlu çerezler, performans çerezleri, işlevsellik çerezleri ve pazarlama çerezleri.'] },
        { h: 'Üçüncü Taraf Çerezleri', p: ['Analitik (örn. Google Analytics) ve reklam ortakları aracılığıyla çerezler kullanılabilir.'] },
        { h: 'Çerez Yönetimi', p: ['Tarayıcı ayarlarınızdan çerezleri reddedebilir veya silebilirsiniz.', 'Bazı çerezler devre dışı bırakıldığında platform işlevleri kısıtlanabilir.'] },
        { h: 'Çerez Süreleri', p: ['Oturum çerezleri tarayıcı kapanınca silinir; kalıcı çerezler belirlenen süre boyunca saklanır.'] },
        { h: 'Onay', p: ['Platformu kullanmaya devam ederek çerez kullanımını kabul etmiş sayılırsınız.'] },
      ],
      contactLine: 'Çerez soruları için: ' + LEGAL_EMAIL,
      updatedLabel: 'Son Güncelleme',
    },
  },
  en: {
    'kvkk': {
      title: 'KVKK / Personal Data Protection Notice',
      intro: 'Under Turkish Personal Data Protection Law No. 6698 (KVKK), Yapgitsin acts as data controller for the personal data processed on the platform.',
      sections: [
        { h: 'Data Controller', p: ['Yapgitsin Bilişim Hizmetleri A.Ş. acts as the data controller.', 'Use the contact channels below for inquiries.'] },
        { h: 'Categories of Personal Data', p: ['Name, phone, email, address, identity photo, location and similar categories may be processed.', 'Service history, ratings and messages are stored for matching purposes.'] },
        { h: 'Purposes of Processing', p: ['Service delivery, identity verification, payments, customer support and legal compliance.', 'Marketing and analytics processing requires separate consent.'] },
        { h: 'Data Transfers', p: ['Data may be shared with payment providers, hosting services and competent authorities when required.', 'Cross-border transfers comply with KVKK Article 9.'] },
        { h: 'Retention', p: ['Personal data is deleted or anonymized once the processing purpose ends or legal retention expires.'] },
        { h: 'Your Rights', p: ['You have rights to access, rectify, erase and object to processing under KVKK Article 11.', 'Submit requests via the contact channel below.'] },
        { h: 'Contact', p: ['For data subject requests: ' + LEGAL_EMAIL] },
      ],
      contactLine: 'Questions: ' + LEGAL_EMAIL,
      updatedLabel: 'Last Updated',
    },
    'kullanim-kosullari': {
      title: 'Terms of Use',
      intro: 'By using Yapgitsin you agree to the following terms.',
      sections: [
        { h: 'Service Description', p: ['Yapgitsin is a technology platform connecting customers with service providers.', 'The platform is not a party to the contract between users.'] },
        { h: 'Account & Registration', p: ['You agree to provide accurate information when registering.', 'You are responsible for the security of your account.'] },
        { h: 'User Obligations', p: ['Users must comply with applicable law and Yapgitsin policies.', 'Fraudulent listings, scams and harassment lead to account termination.'] },
        { h: 'Payments & Tokens', p: ['Submitting offers consumes token balance. Token purchases are non-refundable.'] },
        { h: 'Limitation of Liability', p: ['Yapgitsin is not directly liable for the quality of services rendered between parties.', 'Liability is limited to the extent permitted by law.'] },
        { h: 'Termination', p: ['Yapgitsin may suspend or terminate accounts that breach these terms.'] },
        { h: 'Governing Law', p: ['These terms are governed by the laws of the Republic of Türkiye. Istanbul courts have jurisdiction.'] },
      ],
      contactLine: 'Questions: ' + LEGAL_EMAIL,
      updatedLabel: 'Last Updated',
    },
    'gizlilik-politikasi': {
      title: 'Privacy Policy',
      intro: 'At Yapgitsin we prioritize user privacy. This policy explains what data we collect and how we protect it across our website (yapgitsin.tr) and mobile application.',
      sections: [
        { h: '1. Data Controller', p: ['Yapgitsin Bilişim Hizmetleri is the data controller under this policy.', 'Privacy & data requests: ' + PRIVACY_EMAIL, 'General support: ' + SUPPORT_EMAIL] },
        { h: '2. Information Collected', p: [
          'Account info: email, password hash, name, optional phone. If you sign in with Google: display name, profile photo, email.',
          'Profile data: provider or customer profile, bio, service category, portfolio photos.',
          'Listing content: title, description, category, photos, budget range.',
          'Location: latitude/longitude obtained via the device Geolocator API when creating a listing. Your location is shown as an approximate (locationApprox) area on the map.',
          'Device info: Firebase Cloud Messaging push token, device language, OS version, app version.',
          'Messaging: chat texts, voice messages, timestamps between users.',
          'Transaction logs: token purchases and commission events. Card data is held by the payment provider and never stored by Yapgitsin.',
        ] },
        { h: '3. Device Permissions (Camera, Microphone, Location)', p: [
          'Camera (CAMERA): used for profile photos, job/listing photos and identity verification. Activated only when you tap a photo button; no background camera access. Photos are uploaded over HTTPS/TLS 1.2+ to Yapgitsin servers and deleted when you remove the asset or delete your account.',
          'Microphone (RECORD_AUDIO): activated only when you tap the voice-message record button in chat. Audio is uploaded over TLS and deleted on account deletion. No background listening.',
          'Location (ACCESS_FINE_LOCATION / COARSE): used only in the foreground for explicit user actions such as creating a listing or searching nearby services. Location is shown approximately on the map.',
          'Notifications (POST_NOTIFICATIONS): used for new offers, messages and payment confirmations.',
        ] },
        { h: '4. Use of Information', p: [
          'Account creation and authentication (Firebase Auth + Yapgitsin Auth Service).',
          'Matching customers and providers, listing, personalized search.',
          'Payments and token transactions (via iyzipay/iyzico).',
          'Push notifications via FCM.',
          'Customer support and dispute resolution.',
          'Security, fraud and abuse detection.',
          'Compliance with legal obligations.',
        ] },
        { h: '5. Data Retention', p: [
          'Personal data is retained while your account is active.',
          'When you delete your account, profile data is removed. Financial transaction records (token purchases, commission invoices) are retained for 10 years per Turkish Tax Procedure Law and Code of Obligations.',
          'Chat records are deleted after the dispute-resolution statute of limitations (2-10 years) expires.',
          'Uploaded photos and voice messages are permanently removed when the related listing/chat is deleted or your account is closed.',
        ] },
        { h: '6. Third Parties and Data Transfers', p: [
          'Firebase / Google Cloud (Google LLC): Auth, Firestore (legacy), Cloud Messaging, Storage, Hosting. Data is processed on Google servers, including international transfers.',
          'iyzipay / iyzico (iyzi Ödeme ve Elektronik Para Hizmetleri A.Ş.): payment processor. During a token purchase, your name, surname, email, transaction amount and basketId are shared with iyzipay. Card data (PAN, expiry, CVV) is tokenized directly by iyzipay on PCI-DSS infrastructure and never reaches or is stored by Yapgitsin. iyzipay privacy policy: https://www.iyzico.com/en/privacy. Retention is governed by iyzipay\'s policy and Turkish tax law (10 years).',
          'Apple Push Notification Service: for push delivery on iOS.',
          'AI providers (optional, see Section 7): Google (Gemini API) and Anthropic (Claude API).',
          'Legal authorities: shared on lawful request within statutory limits.',
          'We do not share data with third parties for advertising or sale.',
        ] },
        { h: '7. AI Chat Features', p: [
          'Yapgitsin offers optional in-app AI assistant features powered by Google Gemini API (Google LLC) or Anthropic Claude API (Anthropic, PBC).',
          'Only when you explicitly use AI chat, the message content and minimal context (e.g. the last few messages) are sent to the respective provider API. Account credentials, phone number, payment data and location are not shared with AI providers.',
          'Per the providers\' enterprise API policies, content sent through the API is not used to train models.',
          'AI chat content is not shared with other Yapgitsin users.',
          'AI features are optional; standard messaging and service features work fully without AI. These features may be temporarily disabled in some releases; status changes are announced in-app.',
        ] },
        { h: '8. Cookies', p: ['Our website uses session cookies (Firebase Auth), preference cookies and limited analytics cookies. See our Cookie Policy for details.'] },
        { h: '9. Your Rights (KVKK / GDPR-equivalent)', p: [
          'Under KVKK Art. 11 you have rights to access, rectify, erase, restrict or object to processing of your data, to data portability and to lodge a complaint.',
          'To exercise these rights contact ' + PRIVACY_EMAIL + '; requests are answered within 30 days.',
          'You can also request account deletion in-app: Settings → Delete Account.',
        ] },
        { h: '10. Children\'s Data', p: [
          'Yapgitsin is a commercial services platform with a minimum age of 18.',
          'We do not knowingly collect data from children under 13 (COPPA-aligned). We also do not knowingly collect data from users aged 13-18; if detected, the account is closed and data deleted.',
          'If you believe a child\'s account has been created, contact ' + PRIVACY_EMAIL + ' and we will close it and delete the data immediately.',
        ] },
        { h: '11. Data Security & Encryption', p: [
          'All client/server traffic is encrypted with HTTPS / TLS 1.2+.',
          'Passwords are one-way hashed with bcrypt; we never store plaintext passwords.',
          'Sessions are JWT-based. On mobile, JWT tokens are stored in the device secure enclave (Android Keystore / iOS Keychain) via SecureTokenStore.',
          'Payment data is tokenized by iyzipay; card details (PAN, CVV, expiry) never reach Yapgitsin servers.',
          'Database backups are stored encrypted. Server access uses role-based access control with least-privilege; all access is logged.',
          'You receive a security notification on unusual logins or transactions.',
        ] },
        { h: '12. Policy Changes', p: ['This policy may be updated; users will be notified of material changes in-app or by email.'] },
        { h: '13. Data Controller Contact', p: [
          'Data controller: Yapgitsin Bilişim Hizmetleri',
          'Privacy & KVKK requests: ' + PRIVACY_EMAIL,
          'Legal correspondence: ' + LEGAL_EMAIL,
          'General support: ' + SUPPORT_EMAIL,
        ] },
      ],
      contactLine: 'Privacy questions: ' + PRIVACY_EMAIL,
      updatedLabel: 'Last Updated',
    },
    'cerez-politikasi': {
      title: 'Cookie Policy',
      intro: 'Yapgitsin uses cookies to improve user experience.',
      sections: [
        { h: 'What Are Cookies', p: ['Cookies are small text files stored in your browser by the websites you visit.'] },
        { h: 'Cookie Types We Use', p: ['Essential, performance, functional and marketing cookies.'] },
        { h: 'Third Party Cookies', p: ['Cookies may be set via analytics (e.g. Google Analytics) and advertising partners.'] },
        { h: 'Managing Cookies', p: ['You can refuse or delete cookies via your browser settings.', 'Disabling some cookies may limit platform functionality.'] },
        { h: 'Cookie Lifetime', p: ['Session cookies expire when the browser closes; persistent cookies last for a defined period.'] },
        { h: 'Consent', p: ['By continuing to use the platform you consent to the use of cookies.'] },
      ],
      contactLine: 'Cookie questions: ' + LEGAL_EMAIL,
      updatedLabel: 'Last Updated',
    },
  },
  az: {
    'kvkk': {
      title: 'Şəxsi Məlumatların Qorunması Bildirişi (KVKK)',
      intro: 'Türkiyə 6698 saylı Şəxsi Məlumatların Qorunması Qanununa (KVKK) əsasən, Yapgitsin platformunda emal olunan şəxsi məlumatlar üçün məlumat nəzarətçisi rolunu oynayır.',
      sections: [
        { h: 'Məlumat Nəzarətçisi', p: ['Yapgitsin Bilişim Hizmetleri A.Ş. məlumat nəzarətçisi kimi çıxış edir.', 'Sorğular üçün aşağıdakı əlaqə kanalından istifadə edin.'] },
        { h: 'Emal Olunan Məlumatlar', p: ['Ad, telefon, e-poçt, ünvan, şəxsiyyət fotoşəkli, məkan və oxşar məlumatlar.', 'Xidmətin uyğunlaşdırılması üçün iş tarixi, qiymətləndirmələr və mesajlar saxlanılır.'] },
        { h: 'Emal Məqsədləri', p: ['Xidmət göstərilməsi, doğrulama, ödənişlər, müştəri dəstəyi və qanuni öhdəliklər.', 'Marketinq və analitik üçün ayrıca razılıq tələb olunur.'] },
        { h: 'Məlumat Ötürülməsi', p: ['Məlumatlar lazım gəldikdə ödəniş təminatçıları, hostinq xidmətləri və səlahiyyətli orqanlarla paylaşıla bilər.', 'Xaricə ötürülmələr KVKK 9-cu maddəyə uyğun aparılır.'] },
        { h: 'Saxlama Müddəti', p: ['Şəxsi məlumatlar emal məqsədi başa çatdıqda və ya qanuni saxlama müddəti bitdikdə silinir və ya anonimləşdirilir.'] },
        { h: 'Hüquqlarınız', p: ['KVKK 11-ci maddəsinə əsasən məlumatlara giriş, düzəliş, silmə və etiraz hüquqlarına maliksiniz.', 'Müraciətlərinizi aşağıdakı kanal vasitəsilə göndərin.'] },
        { h: 'Əlaqə', p: ['Məlumat sahibi sorğuları üçün: ' + LEGAL_EMAIL] },
      ],
      contactLine: 'Suallar üçün: ' + LEGAL_EMAIL,
      updatedLabel: 'Son Yenilənmə',
    },
    'kullanim-kosullari': {
      title: 'İstifadə Şərtləri',
      intro: 'Yapgitsin platformasından istifadə etməklə aşağıdakı şərtləri qəbul etmiş sayılırsınız.',
      sections: [
        { h: 'Xidmətin Təsviri', p: ['Yapgitsin müştəriləri və xidmət təminatçılarını birləşdirən texnologiya platformasıdır.', 'Platforma tərəflər arasındakı müqavilənin tərəfi deyil.'] },
        { h: 'Hesab və Qeydiyyat', p: ['Qeydiyyatda dəqiq və güncəl məlumat verməlisiniz.', 'Hesabınızın təhlükəsizliyinə şəxsən cavabdehsiniz.'] },
        { h: 'İstifadəçi Öhdəlikləri', p: ['İstifadəçilər qanunlara və Yapgitsin siyasətlərinə uyğun davranmalıdır.', 'Saxta elanlar, fırıldaqçılıq və təhdidlər hesabın bağlanmasına səbəb olur.'] },
        { h: 'Ödənişlər və Token Sistemi', p: ['Təklif vermə token balansından istifadə edir. Token alışları geri qaytarılmır.'] },
        { h: 'Məsuliyyətin Məhdudlaşdırılması', p: ['Yapgitsin tərəflər arasında göstərilən xidmətlərin keyfiyyətinə görə birbaşa məsul deyil.', 'Məsuliyyət qanunla müəyyən edilmiş hüdudlar daxilindədir.'] },
        { h: 'Xitam', p: ['Yapgitsin şərtləri pozan hesabları istənilən vaxt dayandıra və ya bağlaya bilər.'] },
        { h: 'Tətbiq Olunan Hüquq', p: ['Bu şərtlər Türkiyə Respublikası qanunlarına tabedir. İstanbul məhkəmələri səlahiyyətlidir.'] },
      ],
      contactLine: 'Suallar üçün: ' + LEGAL_EMAIL,
      updatedLabel: 'Son Yenilənmə',
    },
    'gizlilik-politikasi': {
      title: 'Məxfilik Siyasəti',
      intro: 'Yapgitsin olaraq istifadəçi məxfiliyinə üstünlük veririk. Bu siyasət veb saytımız (yapgitsin.tr) və mobil tətbiqimiz üzərindən hansı məlumatları topladığımızı və necə qoruduğumuzu izah edir.',
      sections: [
        { h: '1. Məlumat Nəzarətçisi', p: ['Yapgitsin Bilişim Hizmetleri bu siyasət çərçivəsində məlumat nəzarətçisidir.', 'Məxfilik və KVKK müraciətləri: ' + PRIVACY_EMAIL, 'Ümumi dəstək: ' + SUPPORT_EMAIL] },
        { h: '2. Toplanan Məlumatlar', p: [
          'Hesab məlumatları: e-poçt, parol hash-i, ad-soyad, opsional telefon. Google ilə daxil olursunuzsa: Google adı, profil şəkli, e-poçt.',
          'Profil məlumatları: usta və ya müştəri profili, bioqrafiya, kateqoriya, portfel şəkilləri.',
          'Elan məzmunu: başlıq, təsvir, kateqoriya, şəkillər, büdcə aralığı.',
          'Məkan: elan yaradarkən cihazın Geolocator API-si vasitəsilə alınan enlik/uzunluq. Məkanınız xəritədə təxmini (locationApprox) olaraq göstərilir.',
          'Cihaz məlumatı: FCM push token, cihaz dili, ƏS və tətbiq versiyası.',
          'Mesajlaşma: çat mətnləri, səsli mesajlar və zaman damğaları.',
          'Əməliyyat qeydləri: token alışları, komissiya əməliyyatları (kart məlumatları ödəniş təminatçısında saxlanılır, biz saxlamarıq).',
        ] },
        { h: '3. Cihaz İcazələri (Kamera, Mikrofon, Məkan)', p: [
          'Kamera (CAMERA): Profil şəkli, iş/elan şəkli və şəxsiyyət doğrulaması üçün istifadə olunur. Yalnız şəkil düyməsinə toxunduqda aktivləşir; arxa fonda kamera əlçatımı olmur. Şəkillər HTTPS/TLS 1.2+ üzərindən Yapgitsin serverlərinə yüklənir və faylı sildikdə və ya hesabı bağladıqda silinir.',
          'Mikrofon (RECORD_AUDIO): Yalnız söhbət ekranında səsli mesaj yazma düyməsinə basdıqda aktivləşir. Audio fayllar TLS üzərindən yüklənir və hesab silindikdə tamamilə silinir. Arxa planda dinləmə yoxdur.',
          'Məkan (ACCESS_FINE_LOCATION / COARSE): Yalnız elan yaratma və ya yaxın xidmət axtarışı kimi açıq istifadəçi əməllərində, ön planda istifadə olunur. Məkan xəritədə təxmini göstərilir.',
          'Bildiriş (POST_NOTIFICATIONS): Yeni təklif, mesaj və ödəniş təsdiqi üçün istifadə olunur.',
        ] },
        { h: '4. Məlumatdan İstifadə Məqsədləri', p: [
          'Hesab yaradılması və doğrulama (Firebase Auth + Yapgitsin Auth Service).',
          'Müştəri-usta uyğunlaşdırılması, elan siyahısı, axtarış fərdiləşdirilməsi.',
          'Ödəniş və token əməliyyatları (iyzipay/iyzico vasitəsilə).',
          'FCM ilə push bildirişlər.',
          'Müştəri dəstəyi və mübahisə həlli.',
          'Təhlükəsizlik və fırıldaqçılığın aşkarlanması.',
          'Qanuni öhdəliklərin yerinə yetirilməsi.',
        ] },
        { h: '5. Məlumatın Saxlanma Müddəti', p: [
          'Şəxsi məlumatlar hesabınız aktiv olduğu müddətdə saxlanılır.',
          'Hesabı sildikdə profil məlumatları silinir; lakin maliyyə əməliyyat qeydləri (token alışı, komissiya fakturaları) Türkiyə vergi qanunvericiliyinə əsasən 10 il saxlanılır.',
          'Söhbət qeydləri ümumi məhdudiyyət müddəti (2-10 il) bitdikdən sonra silinir.',
          'Yüklənmiş şəkillər və səsli mesajlar əlaqəli elan/söhbət silindikdə və ya hesab bağlandıqda serverdən tamamilə silinir.',
        ] },
        { h: '6. Üçüncü Tərəflər və Məlumat Ötürülməsi', p: [
          'Firebase / Google Cloud (Google LLC): Auth, Firestore, Cloud Messaging, Storage, Hosting. Məlumatlar Google serverlərində emal olunur; beynəlxalq ötürmə mövcuddur.',
          'iyzipay / iyzico: Ödəniş təminatçımız. Token alışında ad, soyad, e-poçt, məbləğ və səbət ID-si (basketId) iyzipay-ə ötürülür. Kart məlumatları (PAN, CVV, son istifadə tarixi) birbaşa iyzipay tərəfindən PCI-DSS uyğun infrastrukturda tokenləşdirilir və Yapgitsin serverlərinə heç vaxt çatmır. iyzipay məxfilik siyasəti: https://www.iyzico.com/gizlilik-politikasi. Saxlama müddəti iyzipay siyasəti və Türkiyə vergi qanununa (10 il) tabedir.',
          'Apple Push Notification Service: iOS bildirişləri üçün.',
          'AI təminatçıları (opsional, bax madde 7): Google (Gemini API) və Anthropic (Claude API).',
          'Qanuni orqanlar: rəsmi sorğu əsasında qanun çərçivəsində paylaşıla bilər.',
          'Reklam və ya satış məqsədi ilə üçüncü tərəflərlə məlumat paylaşmırıq.',
        ] },
        { h: '7. Süni İntellekt (AI) Söhbət Xüsusiyyətləri', p: [
          'Yapgitsin tətbiqində istifadəçinin açıq seçimi ilə işləyən AI assistent xüsusiyyətləri mövcuddur. Bu xüsusiyyətlər Google Gemini API (Google LLC) və ya Anthropic Claude API (Anthropic, PBC) istifadə edir.',
          'Yalnız AI söhbətindən istifadə etdiyiniz zaman mesaj məzmunu və minimum kontekst (məs. son bir neçə mesaj) müvafiq təminatçı API-sinə göndərilir. Hesab məlumatlarınız, telefonunuz, ödəniş məlumatlarınız və məkanınız AI təminatçılarına göndərilmir.',
          'Təminatçıların korporativ API siyasətinə əsasən API üzərindən göndərilən məzmun model təlimi üçün istifadə edilmir.',
          'AI söhbət məzmunu digər Yapgitsin istifadəçiləri ilə paylaşılmır.',
          'AI xüsusiyyətləri opsionaldır; standart mesajlaşma AI olmadan tam işləyir. Bu xüsusiyyətlər bəzi versiyalarda müvəqqəti söndürülə bilər; dəyişikliklər tətbiq daxilində elan olunur.',
        ] },
        { h: '8. Kukilər', p: ['Veb saytımızda sessiya kukiləri (Firebase Auth), tərcih kukiləri və məhdud analitik kukilər istifadə olunur. Ətraflı: Kuki Siyasəti.'] },
        { h: '9. Hüquqlarınız', p: [
          'KVKK 11-ci maddəyə əsasən: məlumatlara giriş, düzəliş, silmə, etiraz və məhdudlaşdırma hüquqlarına maliksiniz.',
          'Bu hüquqları istifadə etmək üçün ' + PRIVACY_EMAIL + ' ünvanına yazın; müraciətlər ən gec 30 gün ərzində cavablandırılır.',
          'Hesab silmə tələbini tətbiq daxilindən də göndərə bilərsiniz (Ayarlar → Hesabı Sil).',
        ] },
        { h: '10. Uşaqların Məxfiliyi', p: [
          'Yapgitsin kommersiya xidmət platformasıdır və minimum yaş 18-dir.',
          '13 yaşdan kiçik uşaqlardan bilərək məlumat toplamarıq (COPPA prinsipinə uyğun). 13-18 yaş aralığındakı istifadəçilərdən də bilərək məlumat toplamarıq; aşkar edilərsə hesab bağlanır və məlumat silinir.',
          'Uşağa məxsus hesab açıldığını düşünürsünüzsə ' + PRIVACY_EMAIL + ' ünvanına yazın; hesabı dərhal bağlayıb məlumatları siləcəyik.',
        ] },
        { h: '11. Məlumat Təhlükəsizliyi və Şifrələmə', p: [
          'Bütün istemçi-server ünsiyyəti HTTPS / TLS 1.2+ ilə şifrələnir.',
          'Parollar bcrypt alqoritmi ilə birtərəfli hash edilir; düz mətn parol heç bir yerdə saxlanılmır.',
          'Sessiyalar JWT əsaslıdır. Mobil tətbiqdə JWT tokenlər cihazın təhlükəsiz hissəsində (Android Keystore / iOS Keychain) SecureTokenStore vasitəsilə saxlanılır.',
          'Ödəniş məlumatları iyzipay tərəfindən tokenləşdirilir; kart məlumatları Yapgitsin serverlərinə çatmır.',
          'Verilənlər bazası ehtiyat nüsxələri şifrələnərək saxlanılır. Server girişi rol əsaslı (RBAC) və minimum imtiyaz prinsipi ilə məhdudlaşdırılır; bütün girişlər jurnallanır.',
          'Anormal giriş və ya əməliyyat aşkar edildikdə təhlükəsizlik bildirişi alacaqsınız.',
        ] },
        { h: '12. Siyasət Dəyişiklikləri', p: ['Bu siyasət yenilənə bilər; mühüm dəyişikliklər tətbiq daxili bildiriş və ya e-poçt ilə elan olunur.'] },
        { h: '13. Məlumat Nəzarətçisi ilə Əlaqə', p: [
          'Məlumat nəzarətçisi: Yapgitsin Bilişim Hizmetleri',
          'Məxfilik və KVKK müraciətləri: ' + PRIVACY_EMAIL,
          'Hüquqi yazışmalar: ' + LEGAL_EMAIL,
          'Ümumi dəstək: ' + SUPPORT_EMAIL,
        ] },
      ],
      contactLine: 'Məxfilik sualları: ' + PRIVACY_EMAIL,
      updatedLabel: 'Son Yenilənmə',
    },
    'cerez-politikasi': {
      title: 'Kuki Siyasəti',
      intro: 'Yapgitsin istifadəçi təcrübəsini yaxşılaşdırmaq üçün kukilərdən istifadə edir.',
      sections: [
        { h: 'Kuki Nədir', p: ['Kukilər ziyarət etdiyiniz veb saytların brauzerinizdə sakladığı kiçik mətn fayllarıdır.'] },
        { h: 'İstifadə Etdiyimiz Kuki Növləri', p: ['Zəruri, performans, funksional və marketinq kukiləri.'] },
        { h: 'Üçüncü Tərəf Kukiləri', p: ['Analitika (məs. Google Analytics) və reklam tərəfdaşları vasitəsilə kukilər təyin edilə bilər.'] },
        { h: 'Kukilərin İdarə Edilməsi', p: ['Brauzer parametrlərindən kukiləri rədd edə və ya silə bilərsiniz.', 'Bəzi kukiləri söndürmək platforma funksiyalarını məhdudlaşdıra bilər.'] },
        { h: 'Kuki Müddəti', p: ['Sessiya kukiləri brauzer bağlandıqda silinir; davamlı kukilər müəyyən müddət saxlanılır.'] },
        { h: 'Razılıq', p: ['Platformadan istifadəyə davam edərək kukilərin istifadəsinə razılıq verirsiniz.'] },
      ],
      contactLine: 'Kuki sualları: ' + LEGAL_EMAIL,
      updatedLabel: 'Son Yenilənmə',
    },
  },
};

export function getLegalDoc(locale: Locale, key: LegalKey): LegalDoc {
  return CONTENT[locale][key];
}

export default function renderLegal(L: Locale, key: LegalKey) {
  const dict = getDict(L);
  const doc = CONTENT[L][key];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbLD([
              { name: dict.breadcrumb.home, url: localePath(L, '/') },
              { name: doc.title, url: localePath(L, '/' + key) },
            ]),
          ),
        }}
      />
      <article className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 max-w-3xl">
        <nav className="text-xs text-gray-500 mb-3">
          <Link href={localePath(L, '/')} className="hover:text-[var(--primary)]">{dict.breadcrumb.home}</Link>
          <span className="mx-2">/</span>
          <span>{doc.title}</span>
        </nav>
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--secondary)] mb-2">{doc.title}</h1>
        <p className="text-xs text-gray-500 mb-6">{doc.updatedLabel}: {LAST_UPDATED}</p>
        {doc.reviewBanner ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg px-4 py-3 mb-6">
            {doc.reviewBanner}
          </div>
        ) : null}
        <p className="text-base text-gray-700 leading-relaxed mb-8">{doc.intro}</p>
        <div className="space-y-7">
          {doc.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg md:text-xl font-semibold text-[var(--secondary)] mb-2">{s.h}</h2>
              {s.p.map((para, j) => (
                <p key={j} className="text-sm md:text-base text-gray-700 leading-relaxed mb-2">{para}</p>
              ))}
            </section>
          ))}
        </div>
        <hr className="my-8 border-[var(--border)]" />
        <p className="text-sm text-gray-600">{doc.contactLine}</p>
      </article>
    </>
  );
}
