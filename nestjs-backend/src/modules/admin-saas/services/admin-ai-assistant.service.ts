import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { AdminChatMessage } from '../entities/admin-chat-message.entity';
import { GeminiClient } from '../../ai/gemini.client';
import type { GeminiHistoryTurn } from '../../ai/gemini.client';

export type AssistantMode =
  | 'general'
  | 'seo'
  | 'blog'
  | 'content'
  | 'analytics'
  | 'support'
  | 'ops'
  | 'moderation';

const MODE_PROMPTS: Record<AssistantMode, string> = {
  general:
    'Sen Yapgitsin marketplace platformunun admin asistanısın. Türkçe yanıt ver. Pratik, kısa ve operasyonel cevaplar. Platform: müşteri iş açar, hizmet veren teklif verir; kredi sistemi (100 başlangıç, 5 kredi/teklif).',
  seo:
    'Sen Yapgitsin için SEO uzmanı asistansın. Türkçe yanıt ver. Yapgitsin 29 hizmet kategorisi olan iki-taraflı marketplace. Anahtar kelime, başlık önerisi, meta description, schema markup tavsiyeleri ver. Maks 200 kelime.',
  blog:
    'Sen Yapgitsin blog editörüsün. Türkçe yanıt ver. Marketplace blog içeriği için başlık önerileri, paragraf taslakları, outline üret. Tek istek = tek taslak (giriş+başlıklar+kısa paragraflar).',
  content:
    'Sen Yapgitsin içerik yöneticisi asistanısın. Türkçe yanıt ver. UI metin önerileri, kategori açıklamaları, push notification copy, bildirim metinleri için yardım et. Sade, eyleme yönelik.',
  analytics:
    'Sen Yapgitsin analytics asistanısın. Türkçe yanıt ver. KPI yorumlama, anomali açıklama, trend analizi, A/B test sonuç değerlendirmesi. Sayısal verilerle konuş, varsayım yapma.',
  support:
    'Sen Yapgitsin destek ekibi asistanısın. Türkçe yanıt ver. Müşteri sorunu, iade talebi, escrow anlaşmazlığı senaryolarında admin için adım adım yanıt taslağı üret. Empatik ama net.',
  ops:
    'Sen Yapgitsin operasyon asistanısın. Türkçe yanıt ver. Cron, deploy, backup, database performansı, hata logu yorumlama. Teknik ama kısa. Komut + sebep formatı.',
  moderation:
    'Sen Yapgitsin moderasyon asistanısın. Türkçe yanıt ver. Şüpheli kullanıcı, sahte ilan, kötüye kullanım için kontrol listesi ver. Risk seviyesi (yüksek/orta/düşük) ile birlikte aksiyon öner.',
};

const MAX_HISTORY = 8;
const MAX_MESSAGE_CHARS = 4000;

export interface ChatRequest {
  sessionId?: string;
  mode?: string;
  message: string;
  adminId?: string | null;
}

export interface ChatResponse {
  sessionId: string;
  mode: AssistantMode;
  reply: string;
  truncated: boolean;
}

@Injectable()
export class AdminAiAssistantService {
  private readonly logger = new Logger(AdminAiAssistantService.name);

  constructor(
    @InjectRepository(AdminChatMessage)
    private readonly messages: Repository<AdminChatMessage>,
    private readonly gemini: GeminiClient,
  ) {}

  private resolveMode(mode?: string): AssistantMode {
    const m = (mode ?? 'general').toLowerCase();
    if (m in MODE_PROMPTS) return m as AssistantMode;
    return 'general';
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const raw = (req.message ?? '').trim();
    if (!raw) throw new BadRequestException('message boş olamaz');

    const mode = this.resolveMode(req.mode);
    const sessionId = req.sessionId || randomUUID();
    const truncated = raw.length > MAX_MESSAGE_CHARS;
    const message = truncated ? raw.slice(0, MAX_MESSAGE_CHARS) : raw;

    if (!this.gemini.isAvailable()) {
      return {
        sessionId,
        mode,
        reply:
          '[AI çevrim dışı] GEMINI_API_KEY tanımlı değil. Admin paneli .env dosyasına anahtar ekleyince çalışacak.',
        truncated,
      };
    }

    // Load history (last MAX_HISTORY messages of this session)
    const history = await this.messages.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: MAX_HISTORY,
    });

    const turns: GeminiHistoryTurn[] = history.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    let reply = '';
    try {
      reply = await this.gemini.generate({
        systemText: MODE_PROMPTS[mode],
        userText: message,
        history: turns,
        maxOutputTokens: 1024,
        temperature: 0.6,
      });
    } catch (err) {
      this.logger.error(
        `admin AI chat failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      reply = 'AI yanıtı alınamadı (servis hatası). Daha sonra tekrar deneyin.';
    }

    // Persist both turns
    await this.messages.insert([
      {
        sessionId,
        role: 'user',
        content: message,
        mode,
        adminId: req.adminId ?? null,
      },
      {
        sessionId,
        role: 'assistant',
        content: reply,
        mode,
        adminId: req.adminId ?? null,
      },
    ]);

    return { sessionId, mode, reply, truncated };
  }

  async listSessions(limit = 30): Promise<
    Array<{ sessionId: string; mode: string; lastMessageAt: Date; messageCount: number; preview: string }>
  > {
    // Aggregate sessions — SQLite group by.
    const rows: Array<{
      sessionId: string;
      mode: string;
      lastMessageAt: string;
      messageCount: string;
      preview: string;
    }> = await this.messages.query(
      `SELECT sessionId, mode, MAX(createdAt) AS lastMessageAt,
              COUNT(*) AS messageCount,
              (SELECT content FROM admin_chat_messages m2
                WHERE m2.sessionId = admin_chat_messages.sessionId
                  AND m2.role = 'user'
                ORDER BY m2.createdAt ASC LIMIT 1) AS preview
       FROM admin_chat_messages
       GROUP BY sessionId
       ORDER BY lastMessageAt DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map((r) => ({
      sessionId: r.sessionId,
      mode: r.mode,
      lastMessageAt: new Date(r.lastMessageAt),
      messageCount: Number(r.messageCount),
      preview: (r.preview ?? '').slice(0, 120),
    }));
  }

  async getSession(sessionId: string): Promise<AdminChatMessage[]> {
    return this.messages.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteSession(sessionId: string): Promise<{ deleted: number }> {
    const r = await this.messages.delete({ sessionId });
    return { deleted: r.affected ?? 0 };
  }

  getModes(): Array<{ key: AssistantMode; label: string; description: string }> {
    return [
      { key: 'general', label: 'Genel', description: 'Genel admin sorgu / brainstorm' },
      { key: 'seo', label: 'SEO', description: 'Anahtar kelime, meta, schema, içerik stratejisi' },
      { key: 'blog', label: 'Blog', description: 'Blog post taslağı + başlık + outline' },
      { key: 'content', label: 'İçerik', description: 'UI metin, bildirim, push copy önerileri' },
      { key: 'analytics', label: 'Analitik', description: 'KPI yorumlama, anomali, trend' },
      { key: 'support', label: 'Destek', description: 'Müşteri yanıt taslağı, escrow ihtilaf' },
      { key: 'ops', label: 'Operasyon', description: 'Cron, deploy, DB, log yorumlama' },
      { key: 'moderation', label: 'Moderasyon', description: 'Şüpheli kullanıcı / ilan kontrolü' },
    ];
  }
}
