# Phase 128 — Cancel/Refund Flow Security Audit

**Scope:** `POST /bookings/:id/cancel` + token refund insertion (`bookings.service.ts::cancelBooking`, `tokens.service.ts`).
**Mode:** Read-only threat analysis. Implementation by `agent-fs-128`.

---

## 1. Güvenlik Analizi (Cancel Flow Özet)

Akış:
1. JWT guard → `req.user.id` çıkar.
2. `cancelBooking(bookingId, userId, reason)` → booking yükle (with `customer`, `worker` relations).
3. Ownership: `customerId === userId || workerId === userId`.
4. Status guard: `CANCELLED` veya `COMPLETED` ise reddet.
5. Refund hesabı (24h+/100%, <24h/50%, geçmiş/0%) `agreedPrice` üzerinden.
6. `dataSource.transaction` içinde:
   - Booking güncelle (`status=CANCELLED`, `cancelledAt/By`, `refundAmount/Status`).
   - `amount > 0` ise `TokenTransaction` (type=REFUND, status=COMPLETED, method=SYSTEM) ekle.
7. Bildirim (her iki taraf) + istatistik düşür + audit log.

---

## 2. Kritik Riskler (HIGH)

- **H1 — Token bakiyesi inkrement EDİLMİYOR.** `cancelBooking` sadece `TokenTransaction(REFUND)` insert ediyor; `users.tokenBalance` artırılmıyor. Ya `agreedPrice` token cinsindense bakiye eksik kalıyor, ya TL ise yanlış ledger. `tokens.service.purchase()` pattern'i (`userRepo.increment`) refund'da da uygulanmalı.
- **H2 — Idempotency yok.** Ağ retry / çift submit aynı transaction içinde `status===CANCELLED` short-circuit çalışsa da, **transaction commit'inden ÖNCE** iki paralel istek aynı booking'i `findOne` ile okur, ikisi de "open" görür → ikisi de REFUND tx insert edebilir. SQLite serial yazsa da PG'de race olur (double refund).
- **H3 — Cross-table TX eksik.** `users.bumpStat`, `recalcReputation`, `notifications.send`, `auditService.logAction` **transaction dışında**. Tx commit olur ama notification/audit fail ederse iz kaybolur (silent failure).

---

## 3. Orta Seviye Riskler (MEDIUM)

- **M1 — Rate limit yok.** Global ThrottlerModule (60/min IP) yetersiz; aynı user 60 farklı booking'i 1 dakikada iptal edebilir. Cancel başına maliyet (refund tx insert + 2 notification) yüksek.
- **M2 — Reason validation runtime-only.** Controller `body.reason` raw kabul ediyor; servis `Object.values().includes` ile filtreliyor — DTO + `class-validator` `@IsEnum` daha güvenli (whitelist = forbidNonWhitelisted ile birlikte).
- **M3 — Audit PII sızıntısı.** `auditService.logAction` payload'una `agreedPrice` + `reason` giriyor — kabul edilebilir. Ancak `customer.fullName` body'de notification'a giriyor (audit'e değil). Eğer audit detail'a booking entity dump'lanırsa `address`, `description`, `customerNote` PII sızar — bu PR'da yok ama ekleme yaparken dikkat.
- **M4 — Worker iptal ederken müşteriye %50 refund gitmesi adaletsizlik yaratabilir** (worker no-show'un cezası müşteriden kesilir). `cancelledBy` rolüne göre policy farklı olmalı (worker iptal → 100% refund).
- **M5 — `refundStatus` `PROCESSED`'a geçiş yok.** PENDING'de kalıyor; arka plan job veya admin onayı ile PROCESSED'a alınmalı, yoksa "iade yapıldı mı?" belirsiz.

---

## 4. Çözüm Önerileri (Agent #3 implementation ipuçları)

- **Idempotency:** `Idempotency-Key` header (UUID) → `audit_logs` veya yeni `idempotency_keys` tablosu; aynı key + booking + user için cached response döndür. TTL 24h.
- **Rate limit:** `@Throttle({ default: { limit: 5, ttl: 3600_000 } })` → kullanıcı başına saatte 5 cancel. Booking başına da unique constraint zaten var (status==CANCELLED).
- **Atomic balance update:** `await em.increment(User, { id: customerId }, 'tokenBalance', amount)` — TX içinde, refund insert ile aynı `em` üzerinden.
- **TX kapsamını genişlet:** `bumpStat` + `recalcReputation` `em` ile TX içine; notification + audit TX-after (best-effort, try/catch logger).
- **DTO:** `class CancelBookingDto { @IsEnum(CancellationReason) reason }` + `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
- **Pessimistic lock:** `em.findOne(Booking, { where:{id}, lock:{mode:'pessimistic_write'} })` paralel iptal racei kapatır (PG'de). SQLite'da otomatik serial.
- **Worker-vs-customer policy:** `if (cancelledBy===workerId && status>=CONFIRMED) percent=100`.

---

## 5. Güvenlik Kodları (Pseudo)

```ts
// Idempotency middleware
const key = req.header('Idempotency-Key');
if (key) {
  const cached = await idempotencyRepo.findOne({ where: { key, userId, scope: 'booking.cancel' }});
  if (cached) return cached.response;
}

// Atomic refund inside tx
await em.increment(User, { id: booking.customerId }, 'tokenBalance', amount);

// Rate limit decorator
@Throttle({ cancel: { limit: 5, ttl: 3600_000 } })
@Post(':id/cancel')

// Pessimistic lock
const booking = await em.findOne(Booking, {
  where: { id }, lock: { mode: 'pessimistic_write' }
});
```

---

## 6. Hardening Tavsiyeleri (Production)

1. **Distributed lock** (Redis SET NX) prod PG için — DB lock yetmediği yerde.
2. **Refund webhook** İyzipay para iadesi için ayrı flow; token refund ≠ TL para iadesi netleşsin (entity'de `refundCurrency` alanı).
3. **Anomali alarmı:** Aynı user >3 cancel/24h → admin bildirim (fraud signal).
4. **Audit immutable:** `admin_audit_logs` tablosuna `INSERT-only` trigger; UPDATE/DELETE engelle.
5. **Soft delete & retention:** Cancel sonrası booking 90 gün saklansın, sonra anonimize (`address`, `description` clear).
6. **CSP/CORS:** `ALLOWED_ORIGINS` prod'da admin paneli + Flutter origin'lerine sıkı kilit.
7. **OWASP A01 (Broken Access Control)** ve **A04 (Insecure Design — refund logic)** için unit test (paralel cancel, cross-user, status transition matrisi).
8. **Penetration test cases:** çift cancel, expired JWT cancel, tampered booking id (SQL injection — TypeORM safe ama check), reason field XSS'i (yalnız enum, OK).

---

**Sonuç:** Mevcut akışta H1 (balance increment) + H2 (idempotency/lock) **must-fix**. M1-M5 ship öncesi kapatılmalı.
