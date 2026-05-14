"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarSyncService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const user_entity_1 = require("./user.entity");
const booking_entity_1 = require("../bookings/booking.entity");
let CalendarSyncService = class CalendarSyncService {
    users;
    bookings;
    constructor(users, bookings) {
        this.users = users;
        this.bookings = bookings;
    }
    buildUrl(userId, token) {
        const base = process.env.PUBLIC_BASE_URL || 'https://yapgitsin.tr';
        return `${base.replace(/\/$/, '')}/users/${userId}/calendar.ics?token=${token}`;
    }
    async enable(userId) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        if (!user.calendarToken) {
            user.calendarToken = (0, crypto_1.randomUUID)();
            await this.users.save(user);
        }
        return { calendarUrl: this.buildUrl(user.id, user.calendarToken), token: user.calendarToken };
    }
    async regenerate(userId) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        user.calendarToken = (0, crypto_1.randomUUID)();
        await this.users.save(user);
        return { calendarUrl: this.buildUrl(user.id, user.calendarToken), token: user.calendarToken };
    }
    async disable(userId) {
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        user.calendarToken = null;
        await this.users.save(user);
        return { ok: true };
    }
    esc(s) {
        if (!s)
            return '';
        return String(s)
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\r?\n/g, '\\n');
    }
    fmtDt(d) {
        const pad = (n) => String(n).padStart(2, '0');
        return (d.getUTCFullYear().toString() +
            pad(d.getUTCMonth() + 1) +
            pad(d.getUTCDate()) +
            'T' +
            pad(d.getUTCHours()) +
            pad(d.getUTCMinutes()) +
            pad(d.getUTCSeconds()) +
            'Z');
    }
    fold(line) {
        if (line.length <= 75)
            return line;
        const out = [];
        let rest = line;
        out.push(rest.slice(0, 75));
        rest = rest.slice(75);
        while (rest.length > 74) {
            out.push(' ' + rest.slice(0, 74));
            rest = rest.slice(74);
        }
        if (rest.length > 0)
            out.push(' ' + rest);
        return out.join('\r\n');
    }
    async generateIcs(userId, token) {
        if (!token)
            return null;
        const user = await this.users.findOne({ where: { id: userId } });
        if (!user || !user.calendarToken || user.calendarToken !== token)
            return null;
        const todayStr = new Date().toISOString().slice(0, 10);
        const bookings = await this.bookings.find({
            where: {
                workerId: userId,
                status: (0, typeorm_2.In)([
                    booking_entity_1.BookingStatus.PENDING,
                    booking_entity_1.BookingStatus.CONFIRMED,
                    booking_entity_1.BookingStatus.IN_PROGRESS,
                ]),
            },
            order: { scheduledDate: 'ASC' },
        });
        const upcoming = bookings.filter((b) => (b.scheduledDate || '') >= todayStr);
        const customerIds = Array.from(new Set(upcoming.map((b) => b.customerId)));
        const customers = customerIds.length
            ? await this.users.find({ where: { id: (0, typeorm_2.In)(customerIds) }, select: ['id', 'fullName'] })
            : [];
        const nameById = new Map(customers.map((c) => [c.id, c.fullName]));
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Yapgitsin//TR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Yapgitsin Randevular',
            'X-WR-TIMEZONE:Europe/Istanbul',
        ];
        const dtstamp = this.fmtDt(new Date());
        for (const b of upcoming) {
            const [y, m, d] = (b.scheduledDate || '').split('-').map((s) => parseInt(s, 10));
            if (!y || !m || !d)
                continue;
            const [hh, mm] = (b.scheduledTime || '09:00').split(':').map((s) => parseInt(s, 10));
            const startLocal = new Date(Date.UTC(y, m - 1, d, (hh || 9) - 3, mm || 0, 0));
            const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);
            const customerName = nameById.get(b.customerId) || 'Müşteri';
            const summary = `${customerName} — ${b.category}`;
            const status = b.status === booking_entity_1.BookingStatus.CONFIRMED || b.status === booking_entity_1.BookingStatus.IN_PROGRESS
                ? 'CONFIRMED'
                : 'TENTATIVE';
            lines.push('BEGIN:VEVENT');
            lines.push(this.fold(`UID:booking-${b.id}@yapgitsin.tr`));
            lines.push(`DTSTAMP:${dtstamp}`);
            lines.push(`DTSTART:${this.fmtDt(startLocal)}`);
            lines.push(`DTEND:${this.fmtDt(endLocal)}`);
            lines.push(this.fold(`SUMMARY:${this.esc(summary)}`));
            if (b.description) {
                lines.push(this.fold(`DESCRIPTION:${this.esc(b.description)}`));
            }
            if (b.address) {
                lines.push(this.fold(`LOCATION:${this.esc(b.address)}`));
            }
            lines.push(`STATUS:${status}`);
            lines.push('END:VEVENT');
        }
        lines.push('END:VCALENDAR');
        return lines.join('\r\n') + '\r\n';
    }
};
exports.CalendarSyncService = CalendarSyncService;
exports.CalendarSyncService = CalendarSyncService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CalendarSyncService);
//# sourceMappingURL=calendar-sync.service.js.map