-- Manual migration: withdrawals system (run on prod SQLite)
-- Apply once after deploying commit 6f4aa35b. Run on canonical prod DB.

-- 1) User.defaultIban + defaultAccountHolderName (nullable)
ALTER TABLE users ADD COLUMN defaultIban VARCHAR(34);
ALTER TABLE users ADD COLUMN defaultAccountHolderName VARCHAR(100);

-- 2) withdrawal_requests table
CREATE TABLE withdrawal_requests (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  workerId VARCHAR(36) NOT NULL,
  amountMinor INTEGER NOT NULL,
  iban VARCHAR(34) NOT NULL,
  accountHolderName VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','completed')),
  requestedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processedAt DATETIME,
  processedBy VARCHAR(36),
  adminNote TEXT,
  workerNote TEXT
);

CREATE INDEX idx_withdrawal_requests_worker_status ON withdrawal_requests(workerId, status);
CREATE INDEX idx_withdrawal_requests_status_requested ON withdrawal_requests(status, requestedAt);

-- Verify
SELECT name FROM sqlite_master WHERE type='table' AND name='withdrawal_requests';
PRAGMA table_info(users);
