# Yapgitsin Backend — Production Deployment

NestJS backend'i production'a almak için 3 yol. Tavsiye: **Render + Cloudflare + Managed Postgres** (kolay başlangıç) veya **Hetzner VPS + Caddy + Docker Compose** (kontrol + ucuz).

---

## 1. Hızlı Başlangıç — Render (en kolay, free tier var)

1. GitHub repo'yu Render'a bağla → New → Web Service.
2. Root Directory: `nestjs-backend`.
3. Runtime: **Docker** (Dockerfile auto-detect) veya Node:
   - Build: `npm ci && npm run build`
   - Start: `node dist/main`
4. **Environment** sekmesinden `.env.production.example` içindeki tüm değerleri gir.
5. Render Postgres ekle → `DATABASE_URL` ayrı verilirse `DB_HOST/PORT/USERNAME/PASSWORD/NAME` alanlarını parse et veya doğrudan ortam değişkenleri olarak gir.
6. WebSocket: Render Web Service Socket.io destekler — ekstra konfig gerekmez.
7. Health check path: `/health`.

**Free tier kısıtı:** 15 dk inaktiflik sonrası uyur (cold start). Production için Starter ($7/ay) önerilir.

---

## 2. Fly.io (Docker, global edge)

```bash
flyctl launch --no-deploy   # fly.toml üretir, Dockerfile'ı kullanır
flyctl postgres create      # managed PG
flyctl postgres attach <db-name>
flyctl secrets set JWT_SECRET=... ADMIN_INITIAL_PASSWORD=... ANTHROPIC_API_KEY=... \
  ALLOWED_ORIGINS=https://yapgitsin.tr IYZIPAY_API_KEY=... IYZIPAY_SECRET_KEY=...
flyctl deploy
```

`fly.toml` içinde `internal_port = 3001`, `[[services.ports]]` HTTPS handler. WebSocket Fly'da default destekleniyor.

**Free tier:** 3 shared-cpu-1x VM + 3GB volume — küçük workload için yeterli.

---

## 3. VPS — Hetzner / DigitalOcean (Docker Compose)

Önerilen: Hetzner CX22 (€4/ay, 2vCPU/4GB). Ubuntu 22.04 LTS.

```bash
# Sunucuda
apt update && apt install -y docker.io docker-compose-plugin git
git clone <repo> /opt/yapgitsin
cd /opt/yapgitsin/nestjs-backend
cp .env.production.example .env.production
# .env.production'ı doldur
docker compose up -d --build
docker compose logs -f api
```

**Reverse proxy + SSL — Caddy** (otomatik Let's Encrypt):

`/etc/caddy/Caddyfile`:
```
api.yapgitsin.tr {
  reverse_proxy localhost:3001
}
```

`apt install -y caddy && systemctl reload caddy` — sertifika otomatik gelir.

**PM2 alternatif (Docker'sız):**
```bash
npm ci && npm run build
pm2 start dist/main.js --name yapgitsin-api -i 2
pm2 startup && pm2 save
```

---

## 4. Environment Variables Checklist

Zorunlu (production'da yoksa app başlamaz):
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` (32+ karakter rastgele — `openssl rand -base64 48`)
- [ ] `ADMIN_INITIAL_PASSWORD`
- [ ] `ALLOWED_ORIGINS` (`*` veya `localhost` reddedilir)
- [ ] `DB_TYPE=postgres` + tüm DB_* alanları
- [ ] `ANTHROPIC_API_KEY` (AI özellikleri için)

Opsiyonel:
- [ ] `IYZIPAY_*` (ödeme aktif edilecekse)
- [ ] `GLOBAL_PREFIX` (reverse-proxy mount path)
- [ ] `PORT` (default 3001)

---

## 5. PostgreSQL Setup (production şart)

**SQLite production'da KULLANILMAZ:**
- Single-file lock — yatay ölçeklemede kilit çakışması
- Concurrent writer sınırı, yedekleme zor
- Container restart'ta volume mount edilmezse veri kaybı

**Managed Postgres seçenekleri:**
- Render Postgres ($7/ay)
- Fly Postgres (free tier 3GB)
- Supabase (free 500MB)
- Neon (serverless, free 512MB)
- Hetzner managed PG / DigitalOcean Managed DB ($15/ay)

**Migration:** TypeORM `synchronize: true` development'ta tamam, **production'da kapat** ve migration kullan:

```bash
# Migration üret (lokal dev DB schema'dan)
npm run typeorm migration:generate -- src/migrations/Init -d ormconfig.ts

# Production'da çalıştır
npm run typeorm migration:run -d ormconfig.ts
```

`AppModule` içindeki `synchronize` flag'ini `NODE_ENV !== 'production'` olarak ayarla (henüz yoksa TODO).

---

## 6. Health Check + Monitoring

- `GET /health` endpoint'i Phase 53'te eklendi — `{ status: 'ok', uptime, db }` döner.
- Render/Fly health check path: `/health`.
- Uptime monitoring: UptimeRobot (free), BetterStack, Healthchecks.io.
- Log toplama: Render built-in / Fly `flyctl logs` / VPS'de `docker compose logs` veya Loki+Grafana.
- APM (opsiyonel): Sentry (`@sentry/nestjs`), New Relic.

---

## 7. Domain + SSL

**Cloudflare proxy önerilir** — DDoS, cache, ücretsiz SSL.

1. Domain Cloudflare'de → A record: `api.yapgitsin.tr` → sunucu IP.
2. Proxy ON (turuncu bulut).
3. SSL/TLS mode: **Full (strict)**.
4. Origin sertifikası: Render/Fly otomatik Let's Encrypt; VPS'de Caddy halleder.
5. WebSocket: Cloudflare → Network → "WebSockets" toggle ON.

---

## 8. WebSocket (Socket.io)

- **Render:** ✅ destekler, ekstra konfig yok.
- **Fly.io:** ✅ destekler.
- **Heroku:** ⚠️ 30s timeout, sticky session sınırlı — önerilmez.
- **Cloudflare:** ✅ ama "WebSockets" feature toggle açık olmalı.
- Çoklu instance'ta Redis adapter gerekir (`@socket.io/redis-adapter`) — şu an tek instance varsayılıyor.

---

## 9. File Uploads (production'da kritik)

Mevcut `multer` + local `uploads/` klasörü tek-instance'ta tamam, ama:

- **Render/Fly ephemeral filesystem** — restart'ta dosyalar silinir.
- **Çözüm:** Volume mount (Fly volumes, Render disk $1/GB), veya:
- **Object storage** (önerilen):
  - **Cloudflare R2** — S3-uyumlu, egress ücretsiz, $0.015/GB ay
  - **AWS S3** — endüstri standardı
  - **Cloudinary** — image transform built-in
- Migration TODO: `UploadsService`'i `@aws-sdk/client-s3` ile değiştir, `getSignedUrl` ile presigned PUT.

VPS'de Docker volume + nightly backup (rclone → R2) yeterli.

---

## 10. Common Issues + Troubleshooting

| Sorun | Sebep / Çözüm |
|-------|----|
| `Production requires ALLOWED_ORIGINS env` | `.env.production` boş veya yüklenmemiş — env file path'ini kontrol et |
| `Production ALLOWED_ORIGINS rejects "*"` | Tam domain yaz: `https://yapgitsin.tr,https://www.yapgitsin.tr` |
| `JWT_SECRET undefined` → 500 | `292fc2c5` commit'inden sonra hardcoded fallback yok — env zorunlu |
| Socket.io connect ETIMEDOUT | Cloudflare WebSockets toggle OFF veya proxy `Upgrade` header'ı drop ediyor |
| `EADDRINUSE 3001` (lokal) | `netstat -ano \| grep 3001` → `taskkill /PID <pid> /F` |
| Upload 413 Payload Too Large | Reverse proxy (Caddy/Nginx) `client_max_body_size` artır (50MB video için) |
| TypeORM `relation does not exist` | `synchronize:false` üretimde — migration çalıştırılmamış |
| Cold start 30s+ (Render free) | Starter plana yükselt veya cron-ping ile uyanık tut |
| Admin ilk login fail | `ADMIN_INITIAL_PASSWORD` env eksik — `onModuleInit` admin'i oluşturmadı |
| iyzipay sandbox → live | `IYZIPAY_URI=https://api.iyzipay.com` + production key'leri |

---

## Önerilen Production Stack

**Bütçe / kolay:** Render Web Service ($7) + Render Postgres ($7) + Cloudflare (free) + R2 ($1) ≈ **$15/ay**

**Kontrol / ölçeklenebilir:** Hetzner CX22 (€4) + Caddy + Docker Compose + Cloudflare + R2 ≈ **€5/ay**

**Global edge:** Fly.io ($5 starter) + Fly Postgres + Cloudflare ≈ **$10/ay**
