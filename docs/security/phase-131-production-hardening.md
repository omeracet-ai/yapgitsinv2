# Phase 131 — Production Security Hardening Audit

**Tarih:** 2026-05-09
**Kapsam:** `nestjs-backend/`, `web/`, `admin-panel/`, cross-cutting
**Durum:** Production launch öncesi denetim. Trivial fix uygulandı (Helmet middleware), kritik öneriler aşağıda.

---

## 1. Güvenlik Analizi (4 Stack Özet)

| Stack | Mevcut Durum | Skor |
|-------|---|------|
| Backend (NestJS) | JWT exp + ignoreExpiration:false ✓, ALLOWED_ORIGINS prod-guard ✓, Throttler 60 req/dk ✓, Sentry env-guarded ✓, **Helmet eklendi (bu phase)** ✓, file upload mime+size ✓, OTP attempts cap=5 ✓, password reset 32-byte random + SHA256 ✓ | 7/10 |
| Web (Next.js public) | Static export (`output: 'export'`) — host (Apache/IIS) tarafında CSP/HSTS gerekli; client-side API key leak yok | 6/10 |
| Admin Panel | JWT exp decode kontrolü ✓ (5dcbf701), super-admin guard mevcut ✓, basePath=/admin | 7/10 |
| Cross-cutting | `.env` ve `.env.production` gitignore'da ✓, `.env.production.example` template var ✓, `npm audit`: **15 vuln (8 low, 1 mod, 6 high)** sqlite3→tar zinciri | 5/10 |

---

## 2. Kritik Riskler (HIGH — Production Blocker)

| # | Risk | Konum | Etki |
|---|------|-------|------|
| H1 | **JWT_SECRET zayıf entropi** — `yapgitsin_ultra_secret_2026_key` (string-guess edilebilir, 36 byte ASCII). Production'da 256-bit random olmalı | `nestjs-backend/.env` | Tüm JWT'ler forge edilebilir → tam compromise |
| H2 | **ADMIN_INITIAL_PASSWORD prod-grade değil** — `yapgitsin_admin_pass_34` (sözlük türevli) | `nestjs-backend/.env` | Brute-force riski |
| H3 | **Helmet middleware yoktu** — XSS, clickjacking, MIME sniffing default header yoktu | `main.ts` | **FIX UYGULANDI** ✓ |
| H4 | **`.env.production` gitignore'da fakat dosya var** — repo dışı paylaşıma karşı açık (FTP, backup) | `nestjs-backend/.env.production` | Secret leak |
| H5 | **npm audit: 6 high (node-tar path traversal, hardlink escape)** sqlite3 zinciri | `nestjs-backend/package.json` | Build zinciri RCE potansiyeli |
| H6 | **HSTS / CSP host tarafında zorunlu değil** — static export Next.js header set edemiyor | `web/`, IIS/Apache config | MITM, XSS surface |

---

## 3. Orta Seviye Riskler (MEDIUM — Fix Önerilir)

| # | Risk | Konum | Çözüm |
|---|------|-------|-------|
| M1 | İyzipay sandbox key'leri `.env`'de **dummy görünümlü** ama production'da gerçek key gerekecek | `.env` | Prod deploy öncesi rotation |
| M2 | Audit log payload `Record<string, unknown>` — PII (email/phone) yazılabilir, redact yok | `admin-audit.service.ts` | PII alan whitelist'i |
| M3 | Throttler global 60/dk — **login/register/OTP için ayrı düşük limit** yok (5/dk önerilir) | `app.module.ts` | `@Throttle({ short: ... })` decorator'ı login route'larına |
| M4 | Swagger UI prod'da açık (`/api/docs`) | `main.ts` | `if (!isProd)` ile gizle |
| M5 | CORS `credentials: true` + array origin OK, ama `OPTIONS` için preflight cache header (`Access-Control-Max-Age`) yok | `main.ts` | maxAge 86400 ekle |
| M6 | uploads/ statik klasör directory listing'e karşı default kapalı, ama dosya adları sequential predictable | `uploads.controller.ts` | `randomUUID()` filename |
| M7 | uuid lib `moderate` (buffer bounds) | `package.json` | `npm audit fix` |

---

## 4. Çözüm Önerileri (Action Items)

### H1 — JWT_SECRET rotation
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
# Çıktıyı .env JWT_SECRET=... yaz, prod'da ortam değişkeni manager'ı (AWS SM, Vault) kullan
```

### H2 — Admin password
İlk login sonrası `/admin/change-password` zorunlu (force flag user.entity'e `mustChangePassword`).

### H4 — .env.production
Sunucuda OS environment olarak set et, dosyaya yazma. PM2 ecosystem.config.js veya systemd EnvironmentFile (mode 600).

### H5 — npm audit
```bash
cd nestjs-backend && npm audit fix
# breaking olanlar için sqlite3 → better-sqlite3 migration düşün veya dev-dep'e taşı (prod postgres)
```

### H6 — HSTS/CSP host config (IIS web.config örnek)
```xml
<httpProtocol>
  <customHeaders>
    <add name="Strict-Transport-Security" value="max-age=63072000; includeSubDomains; preload" />
    <add name="X-Content-Type-Options" value="nosniff" />
    <add name="X-Frame-Options" value="SAMEORIGIN" />
    <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
    <add name="Content-Security-Policy" value="default-src 'self'; img-src 'self' data: https://api.yapgitsin.tr; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.yapgitsin.tr wss://api.yapgitsin.tr" />
  </customHeaders>
</httpProtocol>
```

---

## 5. Güvenlik Kodları (Snippets)

### Helmet middleware (UYGULANDI — `main.ts`)
```ts
import helmet from 'helmet';
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // /uploads erişimi için
  contentSecurityPolicy: false, // API için gereksiz
}));
```

### Login için sıkı rate limit (öneri)
```ts
// auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login(...) { ... }
```

### Swagger prod gizleme (öneri)
```ts
if (process.env.NODE_ENV !== 'production') {
  SwaggerModule.setup('api/docs', app, document, { ... });
}
```

### Audit log PII redaction (öneri)
```ts
const SENSITIVE = ['password', 'passwordHash', 'token', 'iyzipayKey'];
function redact(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      SENSITIVE.includes(k) ? [k, '[REDACTED]'] : [k, v]
    )
  );
}
```

---

## 6. Hardening Tavsiyeleri (Production Launch Pre-Flight)

- [ ] **JWT_SECRET** rotate (256-bit random) + secrets manager'a taşı
- [ ] **ADMIN_INITIAL_PASSWORD** rotate; ilk login'de force change
- [ ] **`.env.production` dosyasını sunucudan sil**, OS env / vault kullan
- [ ] `npm audit fix` çalıştır (uuid moderate). sqlite3→pg switch (prod postgres) ile high'lar düşer
- [ ] Login/register/OTP endpoint'lerine `@Throttle({ limit: 5, ttl: 60000 })`
- [ ] Swagger `/api/docs` prod'da kapalı
- [ ] Audit log payload PII redaction
- [ ] Web sunucu (IIS/Apache) HSTS + CSP + X-Frame-Options + Referrer-Policy header'ları
- [ ] SSL/TLS only (HTTP 80 → 301 → HTTPS), TLS 1.2+
- [ ] Iyzipay key rotation (sandbox → prod)
- [ ] Uploads klasörü için directory listing kapalı (IIS: `<directoryBrowse enabled="false" />`)
- [ ] Sentry DSN prod'da set edilmiş ✓ env-guarded
- [ ] `npm run build` çıktısı prod'a, dev dependencies sunucuya kopyalanmasın
- [ ] DB backup şifrelenmiş + retention policy
- [ ] CORS `Access-Control-Max-Age: 86400` preflight cache

---

## Özet Skorları

| Severity | Sayı |
|----------|------|
| HIGH | 6 (1 fix uygulandı, 5 launch-blocker) |
| MEDIUM | 7 |
| LOW | npm audit: 8 low |

**Production launch için minimum:** H1, H2, H4, H5, H6 kapatılmalı. M3, M4, M7 hızlı kazançlar.
