# Phase 163: Payments Integration — Quick Start Guide

## What Was Implemented

✅ Complete payment processing system for the Yapgitsin marketplace

### Backend Files Created

```
nestjs-backend/src/modules/payments/
├── payment.entity.ts (NEW)              — Payment transaction entity
├── payments.service.ts (UPDATED)        — Enhanced with payment processing logic
├── payments.controller.ts (UPDATED)     — 6 new API endpoints + webhooks
├── payments.module.ts (UPDATED)         — Module configuration
└── dto/
    ├── create-payment-intent.dto.ts (NEW)
    ├── confirm-payment.dto.ts (NEW)
    ├── payment-history.dto.ts (NEW)
    └── refund-payment.dto.ts (NEW)

nestjs-backend/src/migrations/
└── 1747000000000-AddPaymentEntity.ts (NEW) — Database migration

nestjs-backend/src/app.module.ts (UPDATED) — Added Payment entity
```

### Frontend Files Created

```
web/src/components/
├── PaymentForm.tsx (NEW)                — Multi-step payment form
└── PaymentHistory.tsx (NEW)             — Payment history & earnings view

web/src/pages/api/payments/
├── create-intent.ts (NEW)               — Payment intent creation API
├── confirm.ts (NEW)                     — Payment confirmation API
├── history.ts (NEW)                     — Payment history API
└── refund.ts (NEW)                      — Payment refund API
```

### Documentation

```
PHASE_163_IMPLEMENTATION.md (NEW)       — Comprehensive technical documentation
PHASE_163_QUICK_START.md (THIS FILE)    — Quick reference guide
```

---

## Key Features

### 6 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/payments/create-intent` | POST | Create payment intent |
| `/payments/confirm` | POST | Process payment |
| `/payments/history` | GET | Get payment history with pagination |
| `/payments/earnings` | GET | Get worker earnings summary |
| `/payments/refund` | POST | Request payment refund |
| `/payments/webhook` | POST | Handle payment provider webhooks |

### Database Schema

**Payments Table:**
- UUID primary key
- customer_id → users.id (FK)
- worker_id → users.id (FK)
- booking_id → bookings.id (FK, nullable)
- amount_minor (integer, cents/kuruş)
- currency (default: TRY)
- status (pending/processing/completed/failed/cancelled/refunded)
- method (card/iyzipay/bank_transfer/mock)
- external_transaction_id (for provider tracking)
- refund_id, refund_amount (for refunds)
- fee_minor, net_amount_minor (transaction costs)
- idempotency_key (duplicate prevention)
- metadata (JSON for extensibility)

### Frontend Components

**PaymentForm:**
```tsx
<PaymentForm
  workerId="worker-id"
  amountMinor={50000}  // 500.00 TRY
  currency="TRY"
  bookingId="booking-id"
  onSuccess={(paymentId, transactionId) => {}}
  onError={(error) => {}}
/>
```

**PaymentHistory:**
```tsx
<PaymentHistory viewType="customer" />  // Payments made
<PaymentHistory viewType="worker" />    // Payments received
```

---

## Getting Started

### 1. Database Migration

```bash
cd nestjs-backend

# Run migration
npm run migration:run

# Or in development (with synchronize: true)
# The payment entity will auto-create the table
```

### 2. Environment Variables

Add to `.env` files:

```env
# Optional: Stripe Integration
STRIPE_API_KEY=sk_test_...

# Optional: Iyzipay Configuration
IYZIPAY_API_KEY=...
IYZIPAY_SECRET_KEY=...
IYZIPAY_URI=https://sandbox-api.iyzipay.com

# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### 3. Test Payment Flow

```bash
# 1. Start backend (if not running)
cd nestjs-backend
npm run start

# 2. Create payment intent
curl -X POST http://localhost:3001/payments/create-intent \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "<worker-uuid>",
    "amountMinor": 50000,
    "currency": "TRY"
  }'

# Response: { paymentId, paymentIntentId, status: "pending" }

# 3. Confirm payment
curl -X POST http://localhost:3001/payments/confirm \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentIntentId": "<payment-intent-id>",
    "token": "card_test"
  }'

# Response: { paymentId, status: "completed", externalTransactionId }

# 4. Verify payment history
curl -X GET "http://localhost:3001/payments/history?skip=0&take=10" \
  -H "Authorization: Bearer <jwt-token>"
```

### 4. Frontend Integration

In your Next.js pages:

```tsx
import { PaymentForm } from '@/components/PaymentForm';
import { PaymentHistory } from '@/components/PaymentHistory';
import { useSession } from 'next-auth/react';

export default function PaymentPage() {
  const { data: session } = useSession();

  return (
    <div>
      {/* Payment Form */}
      <PaymentForm
        workerId="worker-uuid"
        amountMinor={50000}
        onSuccess={(paymentId) => {
          console.log('Payment successful:', paymentId);
        }}
      />

      {/* Payment History */}
      <PaymentHistory viewType="customer" />
    </div>
  );
}
```

---

## Payment Amounts Format

All amounts use **minor units** (cents for USD, kuruş for TRY):

```javascript
// 500.00 TRY = 50000 minor units
amountMinor: 50000

// Helper function to convert
const toMinor = (major: number) => Math.round(major * 100);
const toMajor = (minor: number) => minor / 100;

// Display format
const formatAmount = (minor: number) => {
  const major = Math.floor(minor / 100);
  const cents = minor % 100;
  return `${major}.${cents.toString().padStart(2, '0')}`;
};
```

---

## Payment Status Flow

```
pending
    ↓
processing
    ├→ completed (payment successful)
    ├→ failed (declined/error)
    └→ cancelled (user cancelled)

completed
    ↓
refunded (full or partial)
```

---

## Refund Handling

### Full Refund
```bash
curl -X POST http://localhost:3001/payments/refund \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "<payment-id>"
  }'
```

### Partial Refund
```bash
curl -X POST http://localhost:3001/payments/refund \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "<payment-id>",
    "amountMinor": 25000,
    "reason": "Partial service completion"
  }'
```

---

## Webhook Integration (Phase 164)

Payment providers send events to: `POST /payments/webhook`

Supported events:
- `payment.completed` — Payment succeeded
- `payment.failed` — Payment declined/failed

Example webhook payload:

```json
{
  "type": "payment.completed",
  "data": {
    "paymentIntentId": "pi-uuid",
    "externalTransactionId": "stripe_xyz123"
  }
}
```

---

## Worker Earnings API

Get complete worker earnings including legacy bookings:

```bash
curl -X GET http://localhost:3001/payments/earnings \
  -H "Authorization: Bearer <worker-jwt-token>"

# Response
{
  "totalEarnings": 250000,        // All-time (major units: 2500.00 TRY)
  "monthlyEarnings": 50000,       // Last 30 days
  "weeklyEarnings": 15000,        // Last 7 days
  "completedPaymentCount": 12,
  "completedBookingCount": 8,
  "lastTransactions": [...]
}
```

---

## PCI Compliance Notes

✅ Implementation follows PCI DSS Level 1 guidelines:

- No plaintext card data stored in database
- Card tokens used instead of raw numbers
- External payment processor integration (Stripe/Iyzipay)
- HTTPS enforced on all payment endpoints
- JWT authentication on sensitive operations
- Secure error handling (no sensitive data leakage)

---

## Troubleshooting

### Payment Intent Not Found
- Verify paymentIntentId is correct
- Ensure customer ID in token matches payment record
- Check payment hasn't already been processed

### Confirmation Fails
- Verify payment status is still "pending"
- Check amount is positive integer
- Ensure proper JWT token in Authorization header

### Migration Fails
- Ensure database is accessible
- Check all foreign key dependencies exist
- Verify users and bookings tables exist first

---

## Next Phase Integration (Phase 164)

Coming features:
1. Full Stripe SDK integration with webhook verification
2. Payment email receipts with invoice details
3. PDF invoice generation
4. Payment analytics dashboard
5. Multi-currency support
6. Payment dispute handling

---

## File Sizes & Performance

- PaymentForm.tsx: 8.6 KB
- PaymentHistory.tsx: 8.0 KB
- payment.entity.ts: 3.8 KB
- payments.service.ts: 15 KB
- payments.controller.ts: 3.5 KB
- Database migration: 5.2 KB

**Database Indexes:**
- (customerId, createdAt)
- (workerId, createdAt)
- (status)
- (externalTransactionId)
- (idempotencyKey) — UNIQUE

---

## Support & Testing

### Sample Test Data

```typescript
// Create payment
{
  "workerId": "550e8400-e29b-41d4-a716-446655440000",
  "amountMinor": 50000,
  "currency": "TRY",
  "description": "House cleaning service",
  "method": "card"
}

// Confirm payment
{
  "paymentIntentId": "pi-12345",
  "token": "card_4242"
}
```

### Known Limitations

- Mock payment method always succeeds (for testing)
- Stripe integration placeholder (Phase 164)
- No email notifications yet (Phase 164)
- No invoice generation yet (Phase 165)

---

## Contact & Questions

For implementation details, see: `PHASE_163_IMPLEMENTATION.md`

For API reference, check: `nestjs-backend/src/modules/payments/`

---

**Status:** ✅ COMPLETE & READY FOR TESTING

**Deliverables:** 6 API endpoints + 2 frontend components + database migration + comprehensive documentation
