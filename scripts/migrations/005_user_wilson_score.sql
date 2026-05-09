-- Phase 173 — Bayesian average + Wilson score lower bound for fair worker ranking.
-- Yeni 5★ tek-yorumlu usta, 50 yorumlu 4.5★ ortalama ustayı geçemesin.
--
-- averageRating: artık Bayesian-shrunk değer (formül: (C*m + sum) / (C+count), C=10, m=4.0)
-- wilsonScore  : pozitif (>=4★) oranın 95% CI lower bound — sıralama anahtarı

ALTER TABLE users ADD COLUMN wilsonScore FLOAT DEFAULT 0;

-- Sıralama indeksleri (top-rated, reputation sort'ları için)
CREATE INDEX IF NOT EXISTS idx_users_wilson_score ON users(wilsonScore);
CREATE INDEX IF NOT EXISTS idx_users_wilson_reputation
  ON users(wilsonScore DESC, reputationScore DESC);

-- Backfill: mevcut user'lar için yeniden hesapla.
-- SQLite'ta sqrt yok; backfill JS tarafında yapılır:
--   scripts/backfill-wilson.js her user için reviews tablosundan
--   sum(rating), count(*), positive(rating>=4) hesaplayıp
--   bayesianAverage + wilsonScore üretir ve users tablosuna yazar.
