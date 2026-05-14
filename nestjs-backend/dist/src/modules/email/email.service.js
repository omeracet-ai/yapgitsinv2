"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
const BRAND = '#007DFE';
function htmlToText(html) {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
function shell(title, bodyHtml) {
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
let EmailService = EmailService_1 = class EmailService {
    logger = new common_1.Logger(EmailService_1.name);
    transporter = null;
    from = 'Yapgitsin <noreply@yapgitsin.tr>';
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
    async send(to, subject, html, text) {
        if (!this.transporter)
            return;
        if (!to)
            return;
        try {
            await this.transporter.sendMail({
                from: this.from,
                to,
                subject,
                html,
                text: text ?? htmlToText(html),
            });
        }
        catch (err) {
            this.logger.error(`Email send failed to ${to}: ${err.message}`);
        }
    }
    async sendWelcome(user) {
        if (!user.email)
            return;
        const name = user.fullName ?? 'Kullanıcı';
        const html = shell('Hoş geldin!', `<p>Merhaba <b>${name}</b>,</p>
       <p>Yapgitsin'e hoş geldin! Türkiye'nin en hızlı hizmet platformuna katıldın.</p>
       <p style="margin:24px 0"><a href="https://yapgitsin.tr" style="background:${BRAND};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Hemen Başla</a></p>
       <p style="color:#6b7280">İlk işini yayımla veya ustaları keşfet.</p>`);
        await this.send(user.email, "Yapgitsin'e hoş geldin!", html);
    }
    async sendBookingConfirmed(user, booking) {
        if (!user.email)
            return;
        const html = shell('Rezervasyon onaylandı', `<p>Merhaba <b>${user.fullName ?? ''}</b>,</p>
       <p>Rezervasyonun onaylandı:</p>
       <ul>
         <li><b>Hizmet:</b> ${booking.category ?? '-'}</li>
         <li><b>Tarih:</b> ${booking.scheduledDate ?? '-'} ${booking.scheduledTime ?? ''}</li>
         <li><b>Adres:</b> ${booking.address ?? '-'}</li>
         ${booking.agreedPrice ? `<li><b>Fiyat:</b> ${booking.agreedPrice} TL</li>` : ''}
       </ul>
       <p>Detaylar uygulamada.</p>`);
        await this.send(user.email, 'Rezervasyon onaylandı — Yapgitsin', html);
    }
    async sendOfferAccepted(worker, customer, job, offer) {
        if (!worker.email)
            return;
        const html = shell('Teklifin kabul edildi!', `<p>Merhaba <b>${worker.fullName ?? ''}</b>,</p>
       <p><b>${customer.fullName ?? 'Müşteri'}</b> "${job.title}" ilanı için teklifini kabul etti.</p>
       <p><b>Anlaşılan fiyat:</b> ${offer.price} TL</p>
       <p style="margin:24px 0"><a href="https://yapgitsin.tr/jobs/${job.id}" style="background:${BRAND};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">İlanı Gör</a></p>`);
        await this.send(worker.email, 'Teklifin kabul edildi — Yapgitsin', html);
    }
    async sendOfferRejected(worker, job, _offer) {
        if (!worker.email)
            return;
        const html = shell('Teklifin reddedildi', `<p>Merhaba <b>${worker.fullName ?? ''}</b>,</p>
       <p>"${job.title}" ilanı için verdiğin teklif reddedildi. Başka fırsatlar seni bekliyor.</p>
       <p style="margin:24px 0"><a href="https://yapgitsin.tr/jobs" style="background:${BRAND};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">İlanları Keşfet</a></p>`);
        await this.send(worker.email, 'Teklif sonucu — Yapgitsin', html);
    }
    async sendPasswordReset(user, resetToken) {
        if (!user.email)
            return;
        const base = process.env.FRONTEND_URL ?? 'https://yapgitsin.tr';
        const url = `${base}/reset-password?token=${resetToken}`;
        const html = shell('Şifre sıfırlama', `<p>Merhaba <b>${user.fullName ?? ''}</b>,</p>
       <p>Şifreni sıfırlamak için aşağıdaki bağlantıya tıkla. Bağlantı 1 saat geçerlidir.</p>
       <p style="margin:24px 0"><a href="${url}" style="background:${BRAND};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Şifremi Sıfırla</a></p>
       <p style="color:#6b7280;font-size:13px">Bu isteği sen yapmadıysan bu mesajı görmezden gelebilirsin.</p>
       <p style="color:#6b7280;font-size:12px;word-break:break-all">${url}</p>`);
        await this.send(user.email, 'Şifre sıfırlama — Yapgitsin', html);
    }
    async sendJobLeadNotification(worker, leadInfo) {
        if (!worker.email)
            return;
        const base = process.env.FRONTEND_URL ?? 'https://yapgitsin.tr';
        const url = `${base}/job-leads/${leadInfo.id}`;
        const budget = leadInfo.budgetMin || leadInfo.budgetMax
            ? `${leadInfo.budgetMin ?? 0} - ${leadInfo.budgetMax ?? '∞'} TL`
            : 'Bütçe belirtilmedi';
        const html = shell('Yeni İş İsteği', `<p>Merhaba <b>${worker.fullName ?? ''}</b>,</p>
       <p><b>${leadInfo.requesterName}</b> senin yetkinliğin alanında bir iş isteği gönderdi:</p>
       <ul style="background:#F8F9FA;padding:16px;border-radius:6px;list-style:none;margin:16px 0">
         <li><b>Hizmet:</b> ${leadInfo.category}</li>
         <li><b>Konum:</b> ${leadInfo.city}</li>
         <li><b>Bütçe:</b> ${budget}</li>
         ${leadInfo.description ? `<li><b>Detay:</b> ${leadInfo.description.substring(0, 100)}...</li>` : ''}
       </ul>
       <p>Hemen yanıt ver ve işi kazan!</p>
       <p style="margin:24px 0"><a href="${url}" style="background:${BRAND};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">İş İsteğini Gör</a></p>`);
        await this.send(worker.email, `Yeni iş isteği: ${leadInfo.category} — Yapgitsin`, html);
    }
    async sendLeadConfirmation(customer, leadInfo) {
        if (!customer.email)
            return;
        const html = shell('İş İsteğin Gönderildi', `<p>Merhaba <b>${customer.fullName ?? ''}</b>,</p>
       <p>İş isteklerin başarıyla gönderildi. Uygun ustalar seni bulacak.</p>
       <ul style="background:#F8F9FA;padding:16px;border-radius:6px;list-style:none;margin:16px 0">
         <li><b>Hizmet:</b> ${leadInfo.category}</li>
         <li><b>Konum:</b> ${leadInfo.city}</li>
       </ul>
       <p>Yakında ustalardan gelen yanıtları görebileceksin.</p>`);
        await this.send(customer.email, 'İş isteklerin gönderildi — Yapgitsin', html);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)()
], EmailService);
//# sourceMappingURL=email.service.js.map