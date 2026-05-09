# iisnode Debug Rehberi (Phase 178)

Sunucuya shell erişimimiz yok — bu rehber FTP + browser ile teşhis için.

## 1. Önce minimal test (NestJS bağımsız)

URL: **http://yapgitsin.tr/backend/_test/**

Beklenen: JSON çıktısı (nodeVersion, env, files...)

| Cevap | Anlamı | Aksiyon |
|---|---|---|
| **200 + JSON** | iisnode + Node binary çalışıyor — sorun NestJS app'te | Adım 2'ye geç |
| **404** | iisnode handler okumadı, web.config bulunamadı | URL Rewrite kurulu mu? Plesk → Components |
| **500** | Node binary yok / bozuk veya iisnode yüklü değil | Plesk → Node.js extension kurulu mu? |
| **403** | Application Pool izinsiz | Plesk → Domain → Permissions → IIS_IUSRS read+execute |
| **502** | iisnode handler tanındı ama Node script crash etti | iisnode log oku (Adım 3) |

JSON çıktısında **kontrol et:**
- `env.DB_HOST: "MISSING"` → `.env.production` okunmuyor (BOM problemi olabilir)
- `env.JWT_SECRET: "MISSING"` → aynı: env yüklenmemiş
- `files.nodeModules: false` → `node_modules` push edilmemiş veya eksik
- `files.mainJs: false` → `dist/` build kopyalanmamış

## 2. boot-check çıktısı (NestJS layer)

URL: **http://yapgitsin.tr/backend/health**

`boot-check.js` önce dependency check yapar; başarısız olursa stderr'a JSON yazar ve 502 döner. iisnode log'u açıp bak.

| Browser cevabı | Yer |
|---|---|
| 200 `{status:'ok',db:'up',...}` | NestJS sağlıklı, sorun çözüldü |
| 502 / 500 | `/httpdocs/backend/iisnode/*.txt` log'larına bak |
| Detailed Error sayfası | `devErrorsEnabled=true` aktif — stack trace gösterilir, ekran görüntüsü al |

## 3. iisnode log oku (FTP)

FileZilla:
1. `/httpdocs/backend/iisnode/` klasörünü aç
2. En son tarihli `.txt` dosyaları (stdout & stderr) indir
3. Notepad / VS Code ile aç

**Aramaca terimler:**
- `BOOT CHECK FAILED` → boot-check.js dependency check kırıldı, JSON görünür
- `Cannot find module` → node_modules eksik dosya
- `MODULE_NOT_FOUND` → aynı
- `EACCES` → Application Pool identity izin sorunu
- `ECONNREFUSED` → DB bağlantısı kurulamıyor
- `Error: Production requires ALLOWED_ORIGINS` → main.ts CORS guard, env eksik
- `JWT_SECRET` → env okunmadı

## 4. Restart trick (no shell)

iisnode `watchedFiles` ile `web.config` ve `.js` dosyalarını izler. Restart için:
1. FTP'den `web.config` indir
2. Bir yorum satırı ekle/çıkar (1 byte değişiklik yeter)
3. Tekrar yükle → iisnode otomatik restart eder

## 5. Sık görülen hatalar tablosu

| Hata | Sebep | Çözüm |
|---|---|---|
| `Cannot find module 'X'` | node_modules tam push edilmemiş | FileZilla "Failed transfers" kontrol; `npm install --omit=dev` lokal sonra tüm `node_modules/` push |
| `EACCES: permission denied` | App Pool identity izinsiz | Plesk panel → Files → Permissions → IIS_IUSRS read+execute (recursive) |
| `ECONNREFUSED 3306` | DB host yanlış | `.env.production` `DB_HOST=localhost` (sunucu içi MariaDB) |
| `Production requires ALLOWED_ORIGINS` | Phase 170 CORS guard | `.env.production`a `ALLOWED_ORIGINS=https://yapgitsin.tr` ekle |
| `secretOrPrivateKey must have a value` | `JWT_SECRET` env eksik | aynı dosyaya `JWT_SECRET=...` ekle |
| iisnode log dizini boş | `loggingEnabled="false"` veya iisnode hiç çalışmadı | web.config attribute kontrol; minimal `_test/` dene |
| `_test/` 200 ama `/health` 502 | NestJS bootstrap kırıldı | iisnode log'da BOOT CHECK FAILED ya da Nest stack trace |

## 6. .env.production için kritik kurallar

- **UTF-8 BOM olmaması** (Notepad ile değil, VS Code "UTF-8" encoding ile kaydet)
- **Line ending CRLF olabilir, sorun değil**
- **Tek tırnak yok** — `KEY=value` formatı (boşluksuz)
- **Yorum satırı `#` ile** başlamalı

## 7. Kontrol checklist (sırayla)

```
[ ] /backend/_test/ → 200 JSON dönüyor mu?
[ ] JSON env.DB_HOST = "***set***" mi?
[ ] JSON env.JWT_SECRET = "***set***" mi?
[ ] JSON files.nodeModules = true mu?
[ ] JSON files.mainJs = true mu?
[ ] /backend/health → 200 mü?
[ ] iisnode/ klasöründe son log temiz mi?
[ ] /admin/ → 200 mü?
```

Tüm satırlar [x] ise sistem ayakta. Bir tanesi [ ] ise yukarıdaki tablodan çözüm bul.
