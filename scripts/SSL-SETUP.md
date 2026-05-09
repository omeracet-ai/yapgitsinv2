# Phase 166 — HTTPS / SSL Aktivasyon Rehberi (yapgitsin.tr)

> Hedef: `yapgitsin.tr` üzerindeki tüm trafiği (web, /admin, /backend, /app) Let's Encrypt sertifikası ile HTTPS'e taşımak; HTTP → HTTPS 301 redirect, HSTS ve mixed content kontrolü.
>
> Ortam: **Plesk for Windows** (IIS reverse proxy, Next.js standalone + NestJS + Flutter Web).

---

## 1. Mevcut Durum (Voldi-sec tarama)

| Bileşen | Durum |
|---|---|
| `https://yapgitsin.tr` | curl 000 — sertifika yok / port 443 kapalı |
| `http://yapgitsin.tr` | 200 OK — HTTP-only |
| Backend Helmet | ✅ aktif (`nestjs-backend/src/main.ts:28-33`) ama HSTS varsayılan default — production override yok |
| `ALLOWED_ORIGINS` | ✅ `https://yapgitsin.tr` ve `https://www.yapgitsin.tr` zaten `.env.production`'da var (HTTP varyantları da listede — SSL sonrası kaldırılmalı) |
| `NEXT_PUBLIC_API_URL` (admin + web) | ✅ `https://yapgitsin.tr/backend` — sertifika gelir gelmez mixed content olmadan çalışır |

---

## 2. Wildcard mı, Tek Host mu?

**Karar: Tek host SAN sertifika (`yapgitsin.tr` + `www.yapgitsin.tr`).**

Gerekçe:
- Tüm servisler aynı domain altında subpath ile (`/admin`, `/backend`, `/app`) — alt domain yok.
- Wildcard (`*.yapgitsin.tr`) DNS-01 challenge ister; Plesk Let's Encrypt UI ile HTTP-01 daha hızlı.
- İleride `api.yapgitsin.tr` veya `cdn.yapgitsin.tr` açılırsa wildcard'a geçilebilir (Plesk panel "Reissue" tek tık).

---

## 3. Plesk Panel Adımları (Production)

### 3.1 Let's Encrypt sertifika kur

1. Plesk Panel → **Domains** → `yapgitsin.tr` → **SSL/TLS Certificates**
2. **"Install a free basic certificate provided by Let's Encrypt"** butonuna tıkla
3. Form:
   - Email: `bysabri0@gmail.com`
   - ☑ **Secure the domain name** (`yapgitsin.tr`)
   - ☑ **Include a "www" subdomain** (`www.yapgitsin.tr`)
   - ☑ **Secure webmail** (varsa)
   - ☐ Wildcard (gereksiz, atlanır)
4. **Get it free** → ~30 saniye içinde sertifika kurulur
5. Otomatik yenileme: Plesk her 60 günde bir kendi yeniler — manuel iş gerekmez

### 3.2 HTTPS'i domain'e bağla

1. **Domains** → `yapgitsin.tr` → **Hosting Settings**
2. **Security** bölümü:
   - ☑ **SSL/TLS support**
   - **Certificate**: dropdown'dan `Lets Encrypt yapgitsin.tr` seç
3. **Apply**

### 3.3 HTTP → HTTPS 301 Redirect

**Yöntem A — Plesk panel toggle (önerilen):**
1. **Domains** → `yapgitsin.tr` → **Hosting Settings**
2. ☑ **Permanent SEO-safe 301 redirect from HTTP to HTTPS**
3. **Apply**

**Yöntem B — Manuel `web.config` (Plesk toggle yoksa):**

`httpdocs/web.config` içine `<system.webServer><rewrite><rules>` bloğunun **en üstüne**:

```xml
<rule name="Redirect to HTTPS" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

### 3.4 HSTS Header (Strict-Transport-Security)

**IIS / Plesk Windows için web.config:**

```xml
<system.webServer>
  <httpProtocol>
    <customHeaders>
      <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
      <add name="X-Content-Type-Options" value="nosniff" />
      <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      <add name="Permissions-Policy" value="geolocation=(self), camera=(), microphone=()" />
    </customHeaders>
  </httpProtocol>
</system.webServer>
```

> ⚠️ HSTS'i ilk gün `max-age=300` (5 dk) ile aç, 24 saat sorunsuz çalıştığını doğrula, sonra `31536000` (1 yıl) yap. Yanlış kurulumda kullanıcılar 1 yıl boyunca siteye erişemez.

> `preload` direktifi **şimdilik eklenmiyor** — preload listesine girmek geri çevrilmez. Phase 167+ için ayrı karar.

---

## 4. CSP (Content Security Policy) Başlangıç Politikası

Backend (`/backend`) için `main.ts` Helmet'te `contentSecurityPolicy: false` — API olduğu için doğru. CSP **web ve admin Next.js tarafında** uygulanır.

### 4.1 Web (`yapgitsin.tr/`) — strict policy

`web/next.config.ts` `headers()` async fonksiyonunda:

```ts
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://plausible.io",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://yapgitsin.tr",
    "connect-src 'self' https://yapgitsin.tr wss://yapgitsin.tr https://plausible.io",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
}
```

### 4.2 Admin (`yapgitsin.tr/admin`) — relaxed (Next.js dev tools, swagger, vs.)

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
img-src 'self' data: blob: https://yapgitsin.tr
connect-src 'self' https://yapgitsin.tr wss://yapgitsin.tr
```

### 4.3 Backend (`/backend`)

CSP gereksiz (API JSON dönüyor). Helmet zaten kapalı (`contentSecurityPolicy: false`) — değişiklik yok.

### 4.4 Flutter Web (`/app/`)

Flutter `unsafe-eval` ihtiyacı var (CanvasKit/skwasm WASM):

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com
worker-src 'self' blob:
```

> CSP Phase 167'de aktive edilecek — bu phase sadece doc; web.config / next.config'e yazılmadı.

---

## 5. Mixed Content Checklist (SSL Sonrası Doğrulama)

| Kontrol | Durum |
|---|---|
| `admin-panel/.env.production` → `NEXT_PUBLIC_API_URL=https://yapgitsin.tr/backend` | ✅ DOĞRU |
| `web/.env.production` → `NEXT_PUBLIC_API_URL=https://yapgitsin.tr/backend` | ✅ DOĞRU |
| `web/.env.production` → `NEXT_PUBLIC_SITE_URL=https://yapgitsin.tr` | ✅ DOĞRU |
| `nestjs-backend/.env.production` → `ALLOWED_ORIGINS` https başlatıyor | ⚠️ Hem `http://` hem `https://` listede — **SSL sonrası `http://` varyantları silinmeli** |
| Flutter mobile `ApiConstants.baseUrl` production override | 🔍 `hizmet_app/lib/core/constants.dart` kontrol et — production build https olmalı |
| WebSocket (Socket.io) `wss://` kullanıyor mu | 🔍 Frontend `chat_service` `io(https://...)` çağırıyorsa otomatik wss — doğrula |
| `<img src="http://...">` veya `fetch('http://...')` hardcode | 🔍 Grep: `grep -r "http://yapgitsin" web/src admin-panel/src hizmet_app/lib` |
| Iyzipay callback URL https | 🔍 `payments.service.ts` redirect URL https olmalı |
| Sitemap / robots.txt host https | 🔍 `web/public/sitemap.xml` kontrol |

**Hızlı doğrulama komutu (SSL sonrası):**
```bash
curl -I https://yapgitsin.tr | grep -i "strict-transport"
curl -I http://yapgitsin.tr  | grep -i "location: https"
# Browser DevTools → Console → "Mixed Content" warning sıfır olmalı
```

---

## 6. Backend Helmet Durumu (Voldi tespit)

`nestjs-backend/src/main.ts` satır 28-33:

```ts
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }),
);
```

**Tespit:**
- ✅ Helmet kurulu (`package.json:50` — `helmet: ^8.1.0`)
- ✅ `crossOriginResourcePolicy` gevşetilmiş (uploads için doğru)
- ⚠️ HSTS `helmet` default'u: `max-age=15552000; includeSubDomains` (180 gün) — production'da 1 yıl önerilir
- ⚠️ Plesk/IIS reverse proxy backend'in önünde olduğu için HSTS aslında **IIS web.config'de** ayarlanmalı (üst katman); helmet HSTS'i de zarar vermez ama IIS layer öncelikli
- ℹ️ **Bu phase'de kod değişikliği YOK** — Phase 167 için aksiyon: helmet'e `hsts: { maxAge: 31536000, includeSubDomains: true }` explicit eklenebilir

---

## 7. CORS Production Allowlist Kontrolü

`nestjs-backend/.env.production:14`:

```
ALLOWED_ORIGINS=https://yapgitsin.tr,https://www.yapgitsin.tr,http://yapgitsin.tr,http://www.yapgitsin.tr,http://localhost:8080,http://localhost:3000
```

**Tespit:**
- ✅ HTTPS varyantları mevcut
- 🔴 **GÜVENLİK RİSKİ (orta — CVSS 4.3)**: `http://yapgitsin.tr` ve `http://www.yapgitsin.tr` listede — SSL aktive edilince HTTP origin CORS'tan kaldırılmalı (saldırgan downgrade saldırısında HTTP origin'den fetch yapabilir)
- 🟡 **DEV LEAKAGE (düşük — CVSS 2.6)**: `http://localhost:8080` ve `http://localhost:3000` production env'de var — `main.ts:87` localhost reddediyor olmalıydı; **ÇELİŞKİ**: kod localhost'u block ederken env file'da localhost var — production deploy'da app **boot at start error fırlatır** ("Production ALLOWED_ORIGINS rejects localhost"). Bu zaten patlamış olmalı; muhtemelen `NODE_ENV=production` env'de set edilmemiş.
- **Aksiyon (Phase 167):** `.env.production`'dan localhost ve http:// origin'leri sil; `NODE_ENV=production` set edildiğinden emin ol.

---

## 8. Aktivasyon Sırası (Önerilen)

1. **Plesk panel → Let's Encrypt kurulum** (5 dk, riski sıfır)
2. **HTTPS test:** `curl -I https://yapgitsin.tr` → 200 + valid cert
3. **HSTS short max-age (300s)** ile başla — 24 saat gözlem
4. **HTTP → HTTPS 301** redirect aç
5. **Mixed content audit** (browser console + curl grep)
6. **`.env.production` ALLOWED_ORIGINS temizle** — http:// + localhost sil → backend restart
7. **HSTS max-age 31536000** + `includeSubDomains`
8. **Phase 167:** CSP policy ekle, Flutter mobile prod URL doğrula, helmet HSTS explicit

---

## 9. Geri Alma Planı (Rollback)

| Adım | Geri al |
|---|---|
| Sertifika sorunlu | Plesk → SSL/TLS → "Self-signed" seç (geçici) |
| HSTS yanlış aktive | `max-age=0` ile yeni header gönder, 1 yıl bekleme yok |
| 301 redirect loop | `web.config` rewrite kuralını yorum satırı yap |
| CORS kırıldı | `ALLOWED_ORIGINS`'a eski origin'leri geri ekle, `pm2 restart` |

---

**Phase 166 — Voldi-sec doc yazımı tamam. Aktif kod değişikliği YOK. Phase 167 implementation için hazır.**
