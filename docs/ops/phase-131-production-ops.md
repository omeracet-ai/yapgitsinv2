# Phase 131 — Production Ops + Monitoring Audit

Tarih: 2026-05-09
Kapsam: Docker, compose, CI/CD, web hosting, Postgres/Redis tuning, monitoring.

## 1. Sistem Analizi

| Katman | Mevcut | Phase |
|---|---|---|
| Backend container | `nestjs-backend/Dockerfile` (node:20-alpine, multi-stage) | 94 |
| Compose | `nestjs-backend/docker-compose.yml` (api + postgres16 + redis7) | 94 |
| Web hosting | `web/public/.htaccess` (Apache, static export) | 86 |
| CI | `.github/workflows/ci.yml` (backend/admin/web/flutter) + lighthouse + smoke | 105 |
| Monitoring | Sentry (Phase 103), Plausible (Phase 104), `/health` endpoint | — |

## 2. Tespit Edilen Sorunlar

| # | Sev | Bulgu |
|---|---|---|
| 1 | High | Dockerfile root user kullanıyor — non-root yok |
| 2 | High | HEALTHCHECK directive yok (compose + Dockerfile) |
| 3 | High | `npm prune --omit=dev` yok → image şişiyor (~400MB+ devDeps) |
| 4 | High | docker-compose: db/redis healthcheck + depends_on condition yok → API db hazır olmadan başlayabilir |
| 5 | Med | Postgres `5432` ve Redis `6379` host'a expose — internal traffic only olmalı |
| 6 | Med | Postgres tuning yok: `statement_timeout`, `idle_in_transaction_session_timeout`, `max_connections` |
| 7 | Med | Redis `maxmemory` + `maxmemory-policy` yok → OOM riski |
| 8 | Med | `tini` (PID 1, sinyal forwarding) yok → graceful shutdown güvensiz |
| 9 | Med | CI: `npm run test` yok, sadece tsc+build; smoke ayrı workflow |
| 10 | Low | `.htaccess`: Brotli `mod_brotli` blok yok (yalnızca DEFLATE) |
| 11 | Low | Memory limit (`deploy.resources.limits`) yok |
| 12 | Low | Log rotation/aggregation tanımlı değil |

## 3. Root Cause

Phase 94 ilk Docker drop'ında "happy path" odaklıydı; production hardening (security + observability) Phase 131'e bırakılmıştı. CI/CD test coverage gating yok çünkü test suite henüz olgunlaşmadı.

## 4. Çözüm Adımları (Production Launch)

Bu commit'te uygulanan trivial fix'ler:
- **Dockerfile**: non-root `app` user, `tini` PID 1, `HEALTHCHECK curl /health`, `npm prune --omit=dev`, `--chown` COPY.
- **docker-compose**:
  - api: `healthcheck`, `depends_on.condition: service_healthy`, `deploy.resources.limits.memory: 1g`.
  - db: `pg_isready` healthcheck, host port commented out, postgres tuning flags (max_connections=100, shared_buffers=256MB, statement_timeout=30s, idle_in_transaction_session_timeout=60s).
  - redis: `maxmemory 256mb`, `maxmemory-policy allkeys-lru`, `appendonly yes`, healthcheck.

Major (öneri):
- **PM2 ecosystem** (compose dışı VM deploy senaryosu için):
  ```js
  module.exports = { apps: [{ name: 'yapgitsin-api', script: 'dist/main.js',
    instances: 'max', exec_mode: 'cluster', max_memory_restart: '800M',
    kill_timeout: 10000, wait_ready: true, listen_timeout: 8000 }] };
  ```
- **Graceful shutdown**: `app.enableShutdownHooks()` + SIGTERM handler `main.ts` içinde (TypeORM connection close).
- **Nginx alternatif** (`web/` static için, Apache yerine):
  ```nginx
  server {
    root /var/www/web/out;
    index index.html;
    location / { try_files $uri $uri/index.html $uri.html =404; }
    location ~* \.(js|css|woff2|png|jpg|svg|webp|avif)$ {
      expires 1y; add_header Cache-Control "public, immutable";
    }
    gzip on; gzip_types text/css application/javascript application/json image/svg+xml;
    brotli on; brotli_types text/css application/javascript application/json;
  }
  ```

## 5. Optimizasyon Önerileri (Resource Tuning)

| Kaynak | Öneri |
|---|---|
| Node heap | `NODE_OPTIONS=--max-old-space-size=768` (1g limit altında) |
| Postgres pool | TypeORM `extra: { max: 20, idleTimeoutMillis: 30000 }` |
| Redis | `tcp-keepalive 60`, persistence AOF every-sec |
| File handles | systemd `LimitNOFILE=65536` veya Docker `ulimits.nofile: 65536` |
| Cluster mode | PM2 `instances: max` (tek host) — compose'da yatay scale: `--scale api=N` + Nginx upstream |
| Log rotation | Docker daemon `log-opts: { max-size: 10m, max-file: 5 }` `/etc/docker/daemon.json` |

## 6. Monitoring Tavsiyeleri

| Katman | Araç | Kurulum |
|---|---|---|
| Uptime | UptimeRobot / Better Uptime | `GET https://api.../health` her 1 dk; Slack/email alert |
| Error tracking | Sentry (Phase 103) | DSN env, release tagging CI'da `SENTRY_RELEASE=$GITHUB_SHA` |
| Web analytics | Plausible (Phase 104) | self-host veya cloud, GDPR-friendly |
| Log aggregation | Grafana Loki (self-host) veya Papertrail (managed) | Docker logging driver `loki` veya `syslog` |
| Metrics | Prometheus + Grafana | NestJS `@willsoto/nestjs-prometheus` `/metrics` endpoint |
| APM | Sentry Performance veya New Relic | tracesSampleRate 0.1 prod |

### Alert eşikleri (önerilen)
- API p95 latency > 800 ms (5 dk)
- Error rate > 2% (5 dk)
- Postgres connections > 80
- Redis memory > 200 MB (256 limit)
- Disk usage > 80%

## 7. CI/CD Notları

`ci.yml` mevcut iyi durumda (npm cache + parallel jobs). Eksikler:
- Test job yok — `npm run test:e2e` job ekle.
- Docker image build + GHCR push job yok — release tag'inde.
- Secret scanning (gitleaks) action eklenebilir.

---

**Sonuç:** 12 bulgu (3 high config, 9 med/low). Trivial fix'ler bu commit'te (Dockerfile + compose). PM2/Nginx/monitoring kurulumu major iş, bağımsız phase'ler.
