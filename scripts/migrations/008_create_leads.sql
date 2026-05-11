-- Phase 160: Create leads and lead_responses tables for lead matching + email flow

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  customerId TEXT,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  description TEXT,
  budgetMin INTEGER,
  budgetMax INTEGER,
  budgetVisible BOOLEAN DEFAULT 0,
  requesterName TEXT NOT NULL,
  requesterPhone TEXT NOT NULL,
  requesterEmail TEXT NOT NULL,
  preferredContactTime TEXT DEFAULT 'flexible', -- 'today', 'this_week', 'flexible'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'closed', 'expired'
  attachments TEXT, -- JSON array of photo URLs
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY(customerId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lead_responses (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  workerId TEXT NOT NULL,
  status TEXT DEFAULT 'sent_email', -- 'sent_email', 'viewed', 'contacted', 'accepted', 'rejected'
  workerMessage TEXT,
  respondedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY(leadId) REFERENCES leads(id),
  FOREIGN KEY(workerId) REFERENCES users(id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_leads_category_city ON leads(category, city);
CREATE INDEX IF NOT EXISTS idx_leads_customerId_status ON leads(customerId, status);
CREATE INDEX IF NOT EXISTS idx_lead_responses_leadId ON lead_responses(leadId);
CREATE INDEX IF NOT EXISTS idx_lead_responses_workerId ON lead_responses(workerId);
CREATE INDEX IF NOT EXISTS idx_lead_responses_status ON lead_responses(status);
