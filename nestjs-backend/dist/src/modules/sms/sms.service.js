"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
let SmsService = SmsService_1 = class SmsService {
    logger = new common_1.Logger(SmsService_1.name);
    async sendSms(to, message) {
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
                if (res.ok && /^0[01]\s/.test(text.trim())) {
                    this.logger.log(`SMS sent via Netgsm to ${to}`);
                    return { success: true, provider: 'netgsm' };
                }
                this.logger.warn(`Netgsm failed: ${text}`);
            }
            catch (e) {
                this.logger.error(`Netgsm error: ${e.message}`);
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
            }
            catch (e) {
                this.logger.error(`Twilio error: ${e.message}`);
                return { success: false, error: e.message };
            }
        }
        this.logger.warn(`SMS disabled (no provider configured) — would send to ${to}: ${message}`);
        return { success: false, error: 'sms_disabled' };
    }
    normalizePhone(phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.startsWith('90') && digits.length === 12)
            return digits.slice(2);
        if (digits.startsWith('0') && digits.length === 11)
            return digits.slice(1);
        return digits;
    }
    toE164(phone) {
        const local = this.normalizePhone(phone);
        return `+90${local}`;
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)()
], SmsService);
//# sourceMappingURL=sms.service.js.map