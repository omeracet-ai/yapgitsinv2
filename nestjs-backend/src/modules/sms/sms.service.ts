import { Injectable, Logger } from '@nestjs/common';

/**
 * Phase 123 — SMS Service
 * Primary: Netgsm (TR), Fallback: Twilio.
 * If neither configured, logs and skips (FCM/Email pattern).
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendSms(to: string, message: string): Promise<{ success: boolean; provider?: string; error?: string }> {
    const ngUser = process.env.NETGSM_USER;
    const ngPass = process.env.NETGSM_PASS;
    const ngHeader = process.env.NETGSM_HEADER;
    const ngUrl = process.env.NETGSM_API_URL || 'https://api.netgsm.com.tr/sms/send/get';

    if (ngUser && ngPass && ngHeader) {
      try {
        const params = new URLSearchParams({
          usercode: ngUser,
          password: ngPass,
          gsmno: this.normalizePhone(to),
          message,
          msgheader: ngHeader,
        });
        const url = `${ngUrl}?${params.toString()}`;
        const res = await fetch(url, { method: 'GET' });
        const text = await res.text();
        // Netgsm success codes: starts with "00" or "01"
        if (res.ok && /^0[01]\s/.test(text.trim())) {
          this.logger.log(`SMS sent via Netgsm to ${to}`);
          return { success: true, provider: 'netgsm' };
        }
        this.logger.warn(`Netgsm failed: ${text}`);
      } catch (e) {
        this.logger.error(`Netgsm error: ${(e as Error).message}`);
      }
    }

    const twSid = process.env.TWILIO_ACCOUNT_SID;
    const twToken = process.env.TWILIO_AUTH_TOKEN;
    const twFrom = process.env.TWILIO_FROM;
    if (twSid && twToken && twFrom) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${twSid}/Messages.json`;
        const body = new URLSearchParams({
          To: this.toE164(to),
          From: twFrom,
          Body: message,
        });
        const auth = Buffer.from(`${twSid}:${twToken}`).toString('base64');
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });
        if (res.ok) {
          this.logger.log(`SMS sent via Twilio to ${to}`);
          return { success: true, provider: 'twilio' };
        }
        const errText = await res.text();
        this.logger.warn(`Twilio failed: ${errText}`);
        return { success: false, error: errText };
      } catch (e) {
        this.logger.error(`Twilio error: ${(e as Error).message}`);
        return { success: false, error: (e as Error).message };
      }
    }

    this.logger.warn(`SMS disabled (no provider configured) — would send to ${to}: ${message}`);
    return { success: false, error: 'sms_disabled' };
  }

  /** Netgsm bekler: 5XXXXXXXXX (10 hane, 5 ile başlar) */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('90') && digits.length === 12) return digits.slice(2);
    if (digits.startsWith('0') && digits.length === 11) return digits.slice(1);
    return digits;
  }

  /** Twilio bekler: +905XXXXXXXXX (E.164) */
  private toE164(phone: string): string {
    const local = this.normalizePhone(phone);
    return `+90${local}`;
  }
}
