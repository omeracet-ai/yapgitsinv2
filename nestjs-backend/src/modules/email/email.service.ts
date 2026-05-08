import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface MailUser {
  id?: string;
  email?: string | null;
  fullName?: string | null;
}

interface MailBooking {
  id: string;
  category?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  address?: string | null;
  agreedPrice?: number | null;
}

interface MailJob {
  id: string;
  title: string;
}

interface MailOffer {
  id: string;
  price: number;
}

const BRAND = '#007DFE';

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F8F9FA;font-family:Arial,sans-serif;color:#2D3E50">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:${BRAND};padding:20px 24px;color:#fff">
      <div style="font-size:22px;font-weight:bold">Yapgitsin</div>
      <div style="font-size:14px;opacity:.9">${title}</div>
    </div>
    <div style="padding:24px;font-size:15px;line-height:1.55">${bodyHtml}</div>
    <div style="padding:16px 24px;background:#F8F9FA;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb">
      Bu mesaj Yapgitsin tarafından otomatik olarak gönderildi.<br/>
      İletişim: <a href="mailto:destek@yapgitsin.tr" style="color:${BRAND}">destek@yapgitsin.tr</a> &nbsp;·&nbsp;
      <a href="https://yapgitsin.tr/unsubscribe" style="color:${BRAND}">Abonelikten çık</a>
    </div>
  </div></body></html>`;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private from = 'Yapgitsin <noreply@yapgitsin.tr>';

  onModuleInit() {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn('Email disabled — SMTP_HOST not set');
      return;
    }
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.EMAIL_FROM ?? this.from;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
    this.logger.log(`Email enabled — ${host}:${port} (secure=${secure})`);
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.transporter) return;
    if (!to) return;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text ?? htmlToText(html),
      });
    } catch (err) {
      this.logger.error(`Email send failed to ${to}: ${(err as Error).message}`);
    }
  }

  async sendWelcome(user: MailUser): Promise<void> {
    if (!user.email) return;
    const name = user.fullName ?? 'Kullanıcı';
    const html = shell(
      'Hoş geldin!',
      `<p>Merhaba <b>${name}</b>,</p>
       <p>Yapgitsin'e hoş geldin! Türkiye'nin en hızlı hizmet platformuna katıldın.</p>
       <p style="margin:24px 0"><a href="https://yapgitsin.tr" style="background:${BRAND};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Hemen Başla</a></p>
       <p style="color:#6b7280">İlk işini yayımla veya ustaları keşfet.</p>`,
    );
    await this.send(user.email, "Yapgitsin'e hoş geldin!", html);
  }

  async sendBookingConfirmed(user: MailUser, booking: MailBooking): Promise<void> {
    if (!user.email) return;
    const html = shell(
      'Rezervasyon onaylandı',
      `<p>Merhaba <b>${user.fullName ?? ''}</b>,</p>
       <p>Rezervasyonun onaylandı:</p>
       <ul>
         <li><b>Hizmet:</b> ${booking.category ?? '-'}</li>
         <li><b>Tarih:</b> ${booking.scheduledDate ?? '-'} ${booking.scheduledTime ?? ''}</li>
         <li><b>Adres:</b> ${booking.address ?? '-'}</li>
         ${booking.agreedPrice ? `<li><b>Fiyat:</b> ${booking.agreedPrice} TL</li>` : ''}
       </ul>
       <p>Detaylar uygulamada.</p>`,
    );
    await this.send(user.email, 'Rezervasyon onaylandı — Yapgitsin', html);
  }

  async sendOfferAccepted(
    worker: MailUser,
    customer: MailUser,
    job: MailJob,
    offer: MailOffer,
  ): Promise<void> {
    if (!worker.email) return;
    const html = shell(
      'Teklifin kabul edildi!',
      `<p>Merhaba <b>${worker.fullName ?? ''}</b>,</p>
       <p><b>${customer.fullName ?? 'Müşteri'}</b> "${job.title}" ilanı için teklifini kabul etti.</p>
       <p><b>Anlaşılan fiyat:</b> ${offer.price} TL</p>
       <p style="margin:24px 0"><a href="https://yapgitsin.tr/jobs/${job.id}" style="background:${BRAND};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">İlanı Gör</a></p>`,
    );
    await this.send(worker.email, 'Teklifin kabul edildi — Yapgitsin', html);
  }

  async sendOfferRejected(worker: MailUser, job: MailJob, _offer: MailOffer): Promise<void> {
    if (!worker.email) return;
    const html = shell(
      'Teklifin reddedildi',
      `<p>Merhaba <b>${worker.fullName ?? ''}</b>,</p>
       <p>"${job.title}" ilanı için verdiğin teklif reddedildi. Başka fırsatlar seni bekliyor.</p>
       <p style="margin:24px 0"><a href="https://yapgitsin.tr/jobs" style="background:${BRAND};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">İlanları Keşfet</a></p>`,
    );
    await this.send(worker.email, 'Teklif sonucu — Yapgitsin', html);
  }

  async sendPasswordReset(user: MailUser, resetToken: string): Promise<void> {
    if (!user.email) return;
    const base = process.env.FRONTEND_URL ?? 'https://yapgitsin.tr';
    const url = `${base}/reset-password?token=${resetToken}`;
    const html = shell(
      'Şifre sıfırlama',
      `<p>Merhaba <b>${user.fullName ?? ''}</b>,</p>
       <p>Şifreni sıfırlamak için aşağıdaki bağlantıya tıkla. Bağlantı 1 saat geçerlidir.</p>
       <p style="margin:24px 0"><a href="${url}" style="background:${BRAND};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Şifremi Sıfırla</a></p>
       <p style="color:#6b7280;font-size:13px">Bu isteği sen yapmadıysan bu mesajı görmezden gelebilirsin.</p>
       <p style="color:#6b7280;font-size:12px;word-break:break-all">${url}</p>`,
    );
    await this.send(user.email, 'Şifre sıfırlama — Yapgitsin', html);
  }
}
