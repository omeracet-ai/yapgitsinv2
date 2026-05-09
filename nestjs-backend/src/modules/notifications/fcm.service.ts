import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

// Lazy import — package may be absent in some environments
type FirebaseAdmin = typeof import('firebase-admin');

/**
 * Phase 113 — Firebase Cloud Messaging service.
 *
 * Initialization is best-effort:
 *  - If FIREBASE_SERVICE_ACCOUNT_JSON env is missing/invalid, FCM is disabled
 *    and sendToUser() becomes a silent no-op.
 *  - Invalid/expired tokens are auto-cleaned from User.fcmTokens.
 */
@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private admin: FirebaseAdmin | null = null;
  private enabled = false;

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      this.logger.log('FCM disabled (FIREBASE_SERVICE_ACCOUNT_JSON not set)');
      return;
    }
    try {
      // Support raw JSON or base64-encoded JSON
      let jsonStr = raw.trim();
      if (!jsonStr.startsWith('{')) {
        jsonStr = Buffer.from(jsonStr, 'base64').toString('utf8');
      }
      const credentials = JSON.parse(jsonStr) as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admin = require('firebase-admin') as FirebaseAdmin;
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(
            credentials as unknown as import('firebase-admin').ServiceAccount,
          ),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
      this.admin = admin;
      this.enabled = true;
      this.logger.log('FCM initialized');
    } catch (err) {
      this.logger.warn(
        `FCM init failed — push disabled: ${(err as Error).message}`,
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Phase 171 — Send to a raw token (single device).
   * Returns true on success. On invalid-token error, removes the token from
   * any user that owns it.
   */
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.enabled || !this.admin || !token) return false;
    try {
      await this.admin.messaging().send({
        token,
        notification: { title, body },
        data: data ?? {},
      });
      return true;
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) {
        await this.cleanupTokens([token]);
      } else {
        this.logger.warn(`FCM sendToToken failed: ${(err as Error).message}`);
      }
      return false;
    }
  }

  /**
   * Phase 171 — Multicast send to many tokens (chunked at 500 per FCM limit).
   * Returns aggregate {successCount, failureCount}. Cleans invalid tokens
   * from owning users automatically.
   */
  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.enabled || !this.admin || !tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }
    const unique = Array.from(
      new Set(tokens.filter((t) => typeof t === 'string' && t.length > 0)),
    );
    if (unique.length === 0) return { successCount: 0, failureCount: 0 };

    const chunkSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const invalid: string[] = [];

    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      try {
        const response = await this.admin.messaging().sendEachForMulticast({
          tokens: chunk,
          notification: { title, body },
          data: data ?? {},
        });
        successCount += response.successCount;
        failureCount += response.failureCount;
        response.responses.forEach((r, idx) => {
          if (!r.success) {
            const code =
              (r.error as { code?: string } | undefined)?.code ?? '';
            if (
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered'
            ) {
              invalid.push(chunk[idx]);
            }
          }
        });
      } catch (err) {
        failureCount += chunk.length;
        this.logger.warn(
          `FCM multicast chunk failed: ${(err as Error).message}`,
        );
      }
    }

    if (invalid.length) {
      await this.cleanupTokens(invalid);
    }
    return { successCount, failureCount };
  }

  /** Remove invalid tokens from any owning users. */
  private async cleanupTokens(invalid: string[]): Promise<void> {
    if (!invalid.length) return;
    try {
      // Find all users whose fcmTokens contain any of the invalid tokens.
      // simple-json field — load candidates, filter in-memory, batch update.
      const candidates = await this.usersRepo
        .createQueryBuilder('u')
        .select(['u.id', 'u.fcmTokens'])
        .where('u.fcmTokens IS NOT NULL')
        .getMany();
      const invalidSet = new Set(invalid);
      for (const u of candidates) {
        const cur = Array.isArray(u.fcmTokens) ? u.fcmTokens : [];
        const next = cur.filter((t) => !invalidSet.has(t));
        if (next.length !== cur.length) {
          await this.usersRepo.update(u.id, {
            fcmTokens: next.length ? next : null,
          });
        }
      }
      this.logger.log(`Cleaned ${invalid.length} invalid FCM token(s)`);
    } catch (err) {
      this.logger.warn(`FCM cleanup failed: ${(err as Error).message}`);
    }
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.enabled || !this.admin) return;
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'fcmTokens', 'pushNotificationsEnabled'],
    });
    if (!user) return;
    if (user.pushNotificationsEnabled === false) return;
    const tokens = Array.isArray(user.fcmTokens)
      ? user.fcmTokens.filter((t) => typeof t === 'string' && t.length > 0)
      : [];
    if (!tokens.length) return;

    try {
      const messaging = this.admin.messaging();
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: data ?? {},
      });

      if (response.failureCount > 0) {
        const invalid: string[] = [];
        response.responses.forEach((r, idx) => {
          if (!r.success) {
            const code = (r.error as { code?: string } | undefined)?.code ?? '';
            if (
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered'
            ) {
              invalid.push(tokens[idx]);
            }
          }
        });
        if (invalid.length) {
          const remaining = tokens.filter((t) => !invalid.includes(t));
          await this.usersRepo.update(userId, {
            fcmTokens: remaining.length ? remaining : null,
          });
          this.logger.log(
            `Cleaned ${invalid.length} invalid FCM token(s) for user ${userId}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`FCM send failed: ${(err as Error).message}`);
    }
  }
}
