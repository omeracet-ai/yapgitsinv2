-- Phase 169: payment_escrows table extension
-- Idempotent: safe to re-run on MariaDB / MySQL 5.7+ / 8.x.
-- Matches PaymentEscrow entity (nestjs-backend/src/modules/escrow/payment-escrow.entity.ts).
--
-- Note: spec mentioned "escrow_transactions"; the existing module already ships a
-- functionally-equivalent payment_escrows table. We extend it instead of
-- duplicating to avoid a parallel orphan table.

CREATE TABLE IF NOT EXISTS payment_escrows (
  id                 VARCHAR(36)  NOT NULL PRIMARY KEY,
  jobId              VARCHAR(36)  NOT NULL,
  offerId            VARCHAR(36)  NOT NULL,
  customerId         VARCHAR(36)  NOT NULL,
  taskerId           VARCHAR(36)  NOT NULL,
  amount             FLOAT        NOT NULL,
  platformFeePct     FLOAT        NOT NULL DEFAULT 15,
  platformFeeAmount  FLOAT        NULL,
  taskerNetAmount    FLOAT        NULL,
  currency           VARCHAR(3)   NOT NULL DEFAULT 'TRY',
  status             ENUM('HELD','RELEASED','REFUNDED','DISPUTED','PARTIAL_REFUND')
                     NOT NULL DEFAULT 'HELD',
  paymentRef         VARCHAR(100) NULL,
  paymentProvider    VARCHAR(32)  NOT NULL DEFAULT 'iyzipay',
  paymentToken       VARCHAR(200) NULL,
  refundAmount       FLOAT        NULL,
  releaseReason      TEXT         NULL,
  refundReason       TEXT         NULL,
  disputeReason      TEXT         NULL,
  heldAt             DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  releasedAt         DATETIME(6)  NULL,
  refundedAt         DATETIME(6)  NULL,
  disputedAt         DATETIME(6)  NULL,
  createdAt          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  INDEX IDX_payment_escrows_jobId      (jobId),
  INDEX IDX_payment_escrows_customerId (customerId),
  INDEX IDX_payment_escrows_taskerId   (taskerId),
  INDEX IDX_payment_escrows_status     (status),
  INDEX IDX_payment_escrows_cust_status (customerId, status),
  INDEX IDX_payment_escrows_paymentToken (paymentToken)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Phase 169 — additive columns for legacy installs (idempotent guards via IF NOT EXISTS available on MariaDB 10.0.2+)
ALTER TABLE payment_escrows
  ADD COLUMN IF NOT EXISTS paymentProvider VARCHAR(32) NOT NULL DEFAULT 'iyzipay';

ALTER TABLE payment_escrows
  ADD COLUMN IF NOT EXISTS paymentToken VARCHAR(200) NULL;

-- ensure index on paymentToken for fast /escrow/confirm lookups
-- (CREATE INDEX IF NOT EXISTS supported on MariaDB 10.0.2+)
CREATE INDEX IF NOT EXISTS IDX_payment_escrows_paymentToken
  ON payment_escrows (paymentToken);

CREATE INDEX IF NOT EXISTS IDX_payment_escrows_status
  ON payment_escrows (status);

CREATE INDEX IF NOT EXISTS IDX_payment_escrows_cust_status
  ON payment_escrows (customerId, status);
