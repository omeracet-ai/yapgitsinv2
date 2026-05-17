/**
 * Phase 248-FU (Voldi-fs) — iyzipay errorCode → Turkish user-facing message.
 *
 * iyzipay her başarısız işlemde `errorCode` + `errorMessage` döndürür. Frontend'e
 * kart sahibine gösterilecek anlaşılır Türkçe mesaj iletmek için bu mapping'i
 * kullanıyoruz. Liste exhaustive değil — bilinen sık hatalar; bilinmeyenlerde
 * iyzipay'in kendi errorMessage'ı fallback olarak döner.
 *
 * Kaynak: iyzipay dev docs / sandbox response gözlemleri.
 */
export const IYZICO_ERROR_MESSAGES: Record<string, string> = {
  '1': 'İşlem başarısız.',
  '10005': 'Sistemsel bir hata oluştu. Lütfen tekrar deneyin.',
  '10012': 'Geçersiz istek. Lütfen kart bilgilerinizi kontrol edin.',
  '10034': 'Geçersiz para birimi.',
  '10051': 'Kart limiti yetersiz veya tutar aşıldı.',
  '10054': 'Kartın son kullanma tarihi geçmiş.',
  '10057': 'Bu işlem için kart sahibi yetkisi bulunmuyor.',
  '10058': 'Bu işlem türü kart tarafından desteklenmiyor.',
  '10084': 'Geçersiz CVC kodu.',
  '10093': 'Geçersiz kart numarası.',
  '10201': '3D Secure doğrulaması başarısız oldu.',
  '10202': '3D Secure imza doğrulaması başarısız.',
  '10204': '3D Secure işlemi banka tarafından reddedildi.',
  '10212': 'Kart sahibi 3D Secure doğrulamasını tamamlamadı.',
  '10219': 'Kart 3D Secure üyeliğine sahip değil.',
  '10220': '3D Secure servisi şu anda kullanılamıyor.',
  '5001': 'Geçersiz işlem.',
  '5002': 'Geçersiz tutar.',
  '5004': 'Banka onay vermedi. Lütfen kartınızı çıkaran bankaya başvurun.',
  '5005': 'Kart hamilini onaylayamadık.',
  '5006': 'Kart bilgileri hatalı.',
  '5007': 'Kart süresi dolmuş.',
  '5008': 'Bu işlem için yetkilendirme başarısız.',
  '5010': 'Banka şu anda işlem yapamıyor. Lütfen sonra tekrar deneyin.',
  '5011': 'Kart limiti yetersiz.',
  '5012': 'Banka işlemi reddetti.',
  '5013': 'Kart kara listede.',
  '5014': 'Şüpheli işlem nedeniyle banka reddi.',
  '5015': 'Geçersiz PIN.',
  '5029': 'Kart sahibi banka ile iletişime geçmeli.',
  '5043': 'Çalıntı veya kayıp kart bildirimi mevcut.',
  '5051': 'Hesap bakiyesi yetersiz.',
  '5054': 'Kartın son kullanma tarihi geçmiş.',
  '5057': 'Kart hamili bu işlemi gerçekleştiremez.',
  '5061': 'Tutar kart limitlerini aşıyor.',
  '5062': 'Kart kısıtlı.',
  '5063': 'Banka güvenlik ihlali tespit etti.',
  '5065': 'Günlük işlem limiti aşıldı.',
};

export function mapIyzicoError(
  errorCode: string | undefined | null,
  fallback: string | undefined | null,
): string {
  if (errorCode && IYZICO_ERROR_MESSAGES[errorCode]) {
    return IYZICO_ERROR_MESSAGES[errorCode];
  }
  return fallback || 'Ödeme işlemi başarısız oldu. Lütfen tekrar deneyin.';
}
