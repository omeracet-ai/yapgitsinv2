import Link from 'next/link';
import { jsonLd, breadcrumbLD } from '@/lib/seo';
import { getDict, localePath, type Locale } from '@/i18n';

export type LegalKey = 'kvkk' | 'kullanim-kosullari' | 'gizlilik-politikasi' | 'cerez-politikasi';

type Section = { h: string; p: string[] };
type LegalDoc = { title: string; intro: string; sections: Section[]; contactLine: string; updatedLabel: string; reviewBanner: string };

const LAST_UPDATED = '2026-05-08';
const LEGAL_EMAIL = 'legal@yapgitsin.tr';

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
      reviewBanner: 'Bu metin avukat onayı sürecindedir; nihai versiyon yakında yayınlanacaktır.',
    },
    'kullanim-kosullari': {
      title: 'Kullanım Koşulları',
      intro: 'Yapgitsin platformunu kullanırken aşağıdaki koşulları kabul etmiş sayılırsınız.',
      sections: [
        { h: 'Hizmet Tanımı', p: ['Yapgitsin, müşterileri ve hizmet sağlayıcıları (ustaları) buluşturan bir teknoloji platformudur.', 'Platform, taraflar arasındaki sözleşme ilişkisinin tarafı değildir.'] },
        { h: 'Hesap ve Üyelik', p: ['Hesap açılışında doğru ve güncel bilgi vermekle yükümlüsünüz.', 'Hesap güvenliğinden bizzat sorumlusunuz.'] },
        { h: 'Kullanıcı Yükümlülükleri', p: ['Yasalara, ahlaka ve Yapgitsin politikalarına uygun davranılması gerekir.', 'Sahte ilan, dolandırıcılık veya taciz tespit edilmesi halinde hesap kapatılır.'] },
        { h: 'Ödeme ve Token Sistemi', p: ['Teklif verme işlemleri token bakiyesi tüketir. Token satın alımları iade edilemez.'] },
        { h: 'Sorumluluk Sınırlaması', p: ['Yapgitsin, taraflar arasında sunulan hizmetlerin kalitesinden doğrudan sorumlu değildir.', 'Maddi ve manevi zararlar için yasal sınırlar dahilinde sorumluluk üstlenir.'] },
        { h: 'Fesih', p: ['Yapgitsin, koşulları ihlal eden hesapları herhangi bir zamanda askıya alabilir veya kapatabilir.'] },
        { h: 'Uygulanacak Hukuk', p: ['İşbu koşullar Türkiye Cumhuriyeti hukukuna tabidir. İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.'] },
      ],
      contactLine: 'Sorularınız için: ' + LEGAL_EMAIL,
      updatedLabel: 'Son Güncelleme',
      reviewBanner: 'Bu metin avukat onayı sürecindedir; nihai versiyon yakında yayınlanacaktır.',
    },
    'gizlilik-politikasi': {
      title: 'Gizlilik Politikası',
      intro: 'Yapgitsin olarak kullanıcı gizliliğini ön planda tutuyoruz. Bu politika, hangi verileri topladığımızı ve nasıl koruduğumuzu açıklar.',
      sections: [
        { h: 'Toplanan Bilgiler', p: ['Hesap bilgileri, profil verileri, kullanım istatistikleri, cihaz bilgileri ve konum verileri.'] },
        { h: 'Bilgi Kullanımı', p: ['Hizmet sunumu, kişiselleştirme, güvenlik ve dolandırıcılık önleme amaçlı kullanılır.'] },
        { h: 'Üçüncü Taraf Paylaşımı', p: ['Verileriniz yalnızca yasal yükümlülükler veya hizmet sağlayıcılarımız (ödeme, hosting) ile sınırlı paylaşılır.'] },
        { h: 'Veri Güvenliği', p: ['SSL/TLS şifreleme, bcrypt parola hash, JWT oturum yönetimi ve sınırlı erişim politikaları uygulanır.'] },
        { h: 'Çocukların Gizliliği', p: ['Platform 18 yaş altı kullanıcılara yönelik değildir.'] },
        { h: 'Kullanıcı Hakları', p: ['Verilerinize erişme, düzeltme, silme talepleri için bizimle iletişime geçebilirsiniz.'] },
        { h: 'Politika Değişiklikleri', p: ['Bu politika güncellenebilir; önemli değişiklikler kullanıcılara bildirilir.'] },
      ],
      contactLine: 'Gizlilik soruları için: ' + LEGAL_EMAIL,
      updatedLabel: 'Son Güncelleme',
      reviewBanner: 'Bu metin avukat onayı sürecindedir; nihai versiyon yakında yayınlanacaktır.',
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
      reviewBanner: 'Bu metin avukat onayı sürecindedir; nihai versiyon yakında yayınlanacaktır.',
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
      reviewBanner: 'This document is pending lawyer review; the final version will be published soon.',
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
      reviewBanner: 'This document is pending lawyer review; the final version will be published soon.',
    },
    'gizlilik-politikasi': {
      title: 'Privacy Policy',
      intro: 'At Yapgitsin we prioritize user privacy. This policy explains what data we collect and how we protect it.',
      sections: [
        { h: 'Information Collected', p: ['Account info, profile data, usage statistics, device info and location data.'] },
        { h: 'Use of Information', p: ['Used for service delivery, personalization, security and fraud prevention.'] },
        { h: 'Third Party Sharing', p: ['Data is shared only with legal authorities or our service providers (payments, hosting).'] },
        { h: 'Data Security', p: ['SSL/TLS encryption, bcrypt password hashing, JWT session management and least-privilege access.'] },
        { h: 'Children Privacy', p: ['The platform is not intended for users under 18.'] },
        { h: 'User Rights', p: ['Contact us to access, correct or delete your data.'] },
        { h: 'Policy Changes', p: ['This policy may be updated; users will be notified of material changes.'] },
      ],
      contactLine: 'Privacy questions: ' + LEGAL_EMAIL,
      updatedLabel: 'Last Updated',
      reviewBanner: 'This document is pending lawyer review; the final version will be published soon.',
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
      reviewBanner: 'This document is pending lawyer review; the final version will be published soon.',
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
      reviewBanner: 'Bu sənəd hüquqşünas baxışındadır; yekun versiya tezliklə dərc olunacaq.',
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
      reviewBanner: 'Bu sənəd hüquqşünas baxışındadır; yekun versiya tezliklə dərc olunacaq.',
    },
    'gizlilik-politikasi': {
      title: 'Məxfilik Siyasəti',
      intro: 'Yapgitsin olaraq istifadəçi məxfiliyinə üstünlük veririk. Bu siyasət hansı məlumatları topladığımızı və necə qoruduğumuzu izah edir.',
      sections: [
        { h: 'Toplanan Məlumatlar', p: ['Hesab məlumatları, profil, istifadə statistikası, cihaz və məkan məlumatları.'] },
        { h: 'Məlumatdan İstifadə', p: ['Xidmət göstərilməsi, fərdiləşdirmə, təhlükəsizlik və fırıldaqçılığın qarşısının alınması.'] },
        { h: 'Üçüncü Tərəflərlə Paylaşım', p: ['Məlumatlar yalnız qanuni səlahiyyətli orqanlarla və xidmət təminatçılarımızla (ödəniş, hostinq) paylaşılır.'] },
        { h: 'Məlumat Təhlükəsizliyi', p: ['SSL/TLS şifrələmə, bcrypt parol hash-i, JWT sessiya idarəetməsi və məhdud giriş siyasətləri.'] },
        { h: 'Uşaqların Məxfiliyi', p: ['Platforma 18 yaşdan kiçik istifadəçilər üçün nəzərdə tutulmayıb.'] },
        { h: 'İstifadəçi Hüquqları', p: ['Məlumatlarınıza giriş, düzəliş və silmə üçün bizimlə əlaqə saxlayın.'] },
        { h: 'Siyasət Dəyişiklikləri', p: ['Bu siyasət yenilənə bilər; mühüm dəyişikliklər istifadəçilərə bildirilir.'] },
      ],
      contactLine: 'Məxfilik sualları: ' + LEGAL_EMAIL,
      updatedLabel: 'Son Yenilənmə',
      reviewBanner: 'Bu sənəd hüquqşünas baxışındadır; yekun versiya tezliklə dərc olunacaq.',
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
      reviewBanner: 'Bu sənəd hüquqşünas baxışındadır; yekun versiya tezliklə dərc olunacaq.',
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
        <p className="text-xs text-gray-500 mb-4">{doc.updatedLabel}: {LAST_UPDATED}</p>
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg px-4 py-3 mb-6">
          {doc.reviewBanner}
        </div>
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
