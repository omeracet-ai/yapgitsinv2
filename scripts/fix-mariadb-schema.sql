-- Yapgitsin Prod MariaDB Schema-Sync
-- 2026-05-27 — Phase 263→265e entity sürümüne göre eksik kolonları ekler.
-- Sorun: backend `Unknown column 'User.emailVerified'` ile crash.
-- Çözüm: ALTER TABLE ADD COLUMN IF NOT EXISTS (MariaDB 10.0.2+).
--
-- Çalıştırma (Plesk → Databases → phpMyAdmin → SQL tab):
--   1. yapgitsin DB seç (sol panelden)
--   2. SQL sekmesine bu dosyayı yapıştır
--   3. "Go" tıkla
--
-- Idempotent: defalarca çalıştırılabilir, mevcut kolonlara dokunmaz.

-- =============================================================
-- USERS TABLE — Critical (emailVerified crash bu yüzden)
-- =============================================================

ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `tenantId` VARCHAR(36) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `profileVideoUrl` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `identityPhotoUrl` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `documentPhotoUrl` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `identityVerified` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `birthDate` VARCHAR(10) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `gender` VARCHAR(10) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `city` VARCHAR(100) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `district` VARCHAR(100) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `address` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `isPhoneVerified` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `emailVerified` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `tokenBalance` FLOAT NOT NULL DEFAULT 100;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `tokenBalanceMinor` INT NOT NULL DEFAULT 10000;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `preferredCurrency` VARCHAR(3) NOT NULL DEFAULT 'TRY';
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asCustomerTotal` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asCustomerSuccess` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asCustomerFail` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asWorkerTotal` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asWorkerSuccess` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `asWorkerFail` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `averageRating` FLOAT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `totalReviews` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `reputationScore` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `wilsonScore` FLOAT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `workerCategories` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `workerBio` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `hourlyRateMin` FLOAT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `hourlyRateMax` FLOAT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `hourlyRateMinMinor` INT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `hourlyRateMaxMinor` INT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `serviceRadiusKm` INT NOT NULL DEFAULT 20;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `isAvailable` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `availabilitySchedule` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `workerSkills` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `badges` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `manualBadges` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `portfolioPhotos` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `portfolioVideos` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `introVideoUrl` VARCHAR(500) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `introVideoDuration` INT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `responseTimeMinutes` INT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `latitude` DOUBLE NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `longitude` DOUBLE NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `lastLocationAt` TIMESTAMP NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `homeGeohash` VARCHAR(12) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `twoFactorSecret` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `suspended` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `suspendedReason` VARCHAR(500) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `suspendedAt` TIMESTAMP NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `suspendedBy` VARCHAR(36) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `deactivated` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `deactivatedAt` TIMESTAMP NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `deletedAt` TIMESTAMP NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `scheduledHardDeleteAt` TIMESTAMP NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `failedLoginAttempts` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `lockedUntil` TIMESTAMP NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `notificationPreferences` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `offerTemplates` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `workerDocuments` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `featuredOrder` INT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `customerMessageTemplates` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `lastSeenAt` TIMESTAMP NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `isOnline` BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `fcmTokens` TEXT NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `pushNotificationsEnabled` BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `referralCode` VARCHAR(20) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `referredByUserId` VARCHAR(36) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `calendarToken` VARCHAR(64) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `firebaseUid` VARCHAR(128) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `tokenVersion` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `defaultIban` VARCHAR(40) NULL;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `defaultAccountHolderName` VARCHAR(100) NULL;

-- =============================================================
-- JOBS TABLE — Phase 265 (targetWorkerId + scheduleFlexibility)
-- =============================================================

ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `targetWorkerId` VARCHAR(36) NULL;
ALTER TABLE `jobs` ADD COLUMN IF NOT EXISTS `scheduleFlexibility` VARCHAR(16) NOT NULL DEFAULT 'flexible';

-- =============================================================
-- OFFERS TABLE — Phase 265c (refresh)
-- =============================================================

ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `refreshCount` INT NOT NULL DEFAULT 0;
ALTER TABLE `offers` ADD COLUMN IF NOT EXISTS `refreshedAt` TIMESTAMP NULL;

-- =============================================================
-- Doğrulama (sonuç gör)
-- =============================================================

SELECT 'users emailVerified' AS check_name,
       COUNT(*) AS exists_flag
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'emailVerified';

SELECT 'users workerDocuments' AS check_name, COUNT(*) AS exists_flag
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='workerDocuments';

SELECT 'jobs targetWorkerId' AS check_name, COUNT(*) AS exists_flag
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='jobs' AND COLUMN_NAME='targetWorkerId';

SELECT 'offers refreshCount' AS check_name, COUNT(*) AS exists_flag
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='offers' AND COLUMN_NAME='refreshCount';
