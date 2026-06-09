import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { MessageLog } from '../entities/message-log.entity';

export interface MessageLogQuery {
  channel?: 'email' | 'fcm' | 'sms' | 'wa';
  status?: 'pending' | 'sent' | 'failed';
  page?: number;
  limit?: number;
}

export interface LogInput {
  channel: 'email' | 'fcm' | 'sms' | 'wa';
  status?: 'pending' | 'sent' | 'failed';
  recipient: string;
  subject?: string | null;
  body?: string | null;
  error?: string | null;
  meta?: Record<string, unknown> | null;
}

@Injectable()
export class MessageLogService {
  private readonly logger = new Logger(MessageLogService.name);

  constructor(
    @InjectRepository(MessageLog)
    private readonly repo: Repository<MessageLog>,
  ) {}

  /** Fire-and-forget. Never throws. */
  async log(input: LogInput): Promise<void> {
    try {
      const entity = this.repo.create({
        channel: input.channel,
        status: input.status ?? 'sent',
        recipient: (input.recipient ?? '').slice(0, 255),
        subject: input.subject ? input.subject.slice(0, 255) : null,
        body: input.body ? input.body.slice(0, 8000) : null,
        error: input.error ? input.error.slice(0, 1000) : null,
        meta: input.meta ?? null,
      });
      await this.repo.save(entity);
    } catch (err) {
      this.logger.warn(
        `message-log insert failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async list(q: MessageLogQuery) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 25)));
    const qb = this.repo
      .createQueryBuilder('m')
      .orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (q.channel) qb.andWhere('m.channel = :channel', { channel: q.channel });
    if (q.status) qb.andWhere('m.status = :status', { status: q.status });
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async get(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async stats() {
    const total = await this.repo.count();
    const failed = await this.repo.count({ where: { status: 'failed' } });
    const sent = await this.repo.count({ where: { status: 'sent' } });
    const last24h = await this.repo
      .createQueryBuilder('m')
      .where("m.createdAt > datetime('now', '-1 day')")
      .getCount();
    const byChannel: Array<{ channel: string; count: string }> =
      await this.repo.query(
        `SELECT channel, COUNT(*) AS count FROM message_log GROUP BY channel`,
      );
    return {
      total,
      sent,
      failed,
      last24h,
      byChannel: byChannel.map((r) => ({
        channel: r.channel,
        count: Number(r.count),
      })),
    };
  }

  /** M8 — Daily purge of logs older than 30 days. */
  @Cron('0 3 * * *')
  async purgeOld(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 86_400_000);
    const r = await this.repo.delete({ createdAt: LessThan(cutoff) });
    if ((r.affected ?? 0) > 0) {
      this.logger.log(`message-log purge: deleted ${r.affected} rows older than 30d`);
    }
  }
}
