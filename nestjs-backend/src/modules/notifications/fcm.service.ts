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
