# SMS OTP Setup (Phase 123)

Yapgitsin'in TR pazarına yönelik SMS OTP entegrasyonu. Primary: **Netgsm**, fallback: **Twilio**.

## 1. Netgsm (Primary — TR specific)

Netgsm Türkiye'nin en yaygın kullanılan toplu SMS sağlayıcısıdır; uygun fiyat + lokal destek.

### Hesap açma
1. https://www.netgsm.com.tr — "Bayi/Kurumsal Üyelik" formu doldur
2. Vergi levhası + imza sirküleri gerekir (kurumsal hesap)
3. Onay sonrası **bayi paneli** kullanıcı adı + şifresi gelir
4. Panelden **mesaj başlığı (header)** başvurusu yap (örn. `YAPGITSIN`) — BTK onayı 1-3 iş günü
5. Test paketi: 100 SMS ücretsiz (sadece kayıtlı tek numara)
6. Production: paket satın al (1.000 / 10.000 / 100.000 SMS)

### Env
```
NETGSM_USER=<bayi kullanıcı adı>
NETGSM_PASS=<bayi şifre>
NETGSM_HEADER=YAPGITSIN
NETGSM_API_URL=https://api.netgsm.com.tr/sms/send/get
```

### API
GET request, parametreler URL'de. Başarı: response `00 <bulkid>` veya `01 <bulkid>` ile başlar.
Hata kodları: https://www.netgsm.com.tr/dokuman/

## 2. Twilio (Fallback — international)

Netgsm uçtuğunda yedek. Daha pahalı (~$0.05/SMS TR) ama uluslararası kapsama.

### Hesap açma
1. https://www.twilio.com/try-twilio
2. Trial credit: $15 (~300 SMS TR)
3. **Phone number** satın al → Türkiye numarası VEYA Alphanumeric Sender ID (header) başvurusu
4. Account SID + Auth Token: console üst bar

### Env
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=<token>
TWILIO_FROM=+14155551234
```

## 3. Test

```bash
curl -X POST http://localhost:3001/auth/sms/request \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"05XXXXXXXXX"}'

curl -X POST http://localhost:3001/auth/sms/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"05XXXXXXXXX","code":"123456"}'
```

### Provider yoksa
Hiçbir env ayarlı değilse `SmsService` "SMS disabled" log atar ve OTP'yi DB'ye yazmaya devam eder. Geliştirici DB'den kodu okuyup test edebilir (dev mode için pratik).

## 4. Rate limit & güvenlik

- Aynı telefon → son 1 saatte max **3 OTP isteği**
- OTP geçerlilik: **5 dakika**
- Yanlış kod denemesi: **5 hata** sonrası kod kilitlenir
- Kullanılmış kod tekrar kullanılamaz (`used=true`)

## 5. Akış

1. Frontend → `POST /auth/sms/request {phoneNumber}` → SMS gönderilir
2. Kullanıcı kodu girer → `POST /auth/sms/verify {phoneNumber, code}`
3. Mevcut kullanıcı varsa → JWT döner (30d)
4. Yoksa → `isNewUser: true` döner, frontend register form'a `phoneVerified` ile yönlendirir
