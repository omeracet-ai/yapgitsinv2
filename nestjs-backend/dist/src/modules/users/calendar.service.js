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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = __importStar(require("crypto"));
const booking_entity_1 = require("../bookings/booking.entity");
const user_entity_1 = require("./user.entity");
let CalendarService = class CalendarService {
    bookingRepo;
    userRepo;
    constructor(bookingRepo, userRepo) {
        this.bookingRepo = bookingRepo;
        this.userRepo = userRepo;
    }
    generateToken() {
        return crypto.randomBytes(32).toString('base64url');
    }
    async getOrCreateCalendarToken(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        if (user.calendarToken)
            return user.calendarToken;
        const token = this.generateToken();
        user.calendarToken = token;
        await this.userRepo.save(user);
        return token;
    }
    async rotateCalendarToken(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
        const token = this.generateToken();
        user.calendarToken = token;
        await this.userRepo.save(user);
        return token;
    }
    async revokeCalendarToken(userId) {
        await this.userRepo.update({ id: userId }, { calendarToken: null });
    }
    async findUserByCalendarToken(token) {
        if (!token || token.length < 16)
            return null;
        return this.userRepo.findOne({ where: { calendarToken: token } });
    }
    async findWorkerBookings(workerId) {
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        const rows = await this.bookingRepo.find({
            where: {
                workerId,
                status: (0, typeorm_2.In)([
                    booking_entity_1.BookingStatus.CONFIRMED,
                    booking_entity_1.BookingStatus.IN_PROGRESS,
                    booking_entity_1.BookingStatus.COMPLETED,
                ]),
            },
            order: { scheduledDate: 'ASC' },
            take: 500,
        });
        return rows.filter((b) => {
            const created = b.createdAt ? new Date(b.createdAt) : null;
            return !created || created >= oneYearAgo;
        });
    }
    escapeText(input) {
        if (!input)
            return '';
        return String(input)
            .replace(/\\/g, '\\\\')
            .replace(/\r\n/g, '\\n')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;');
    }
    foldLine(line) {
        if (line.length <= 75)
            return line;
        const parts = [];
        let i = 0;
        while (i < line.length) {
            parts.push((i === 0 ? '' : ' ') + line.slice(i, i + (i === 0 ? 75 : 74)));
            i += i === 0 ? 75 : 74;
        }
        return parts.join('\r\n');
    }
    fmtUtc(d) {
        const pad = (n, w = 2) => String(n).padStart(w, '0');
        return (d.getUTCFullYear().toString() +
            pad(d.getUTCMonth() + 1) +
            pad(d.getUTCDate()) +
            'T' +
            pad(d.getUTCHours()) +
            pad(d.getUTCMinutes()) +
            pad(d.getUTCSeconds()) +
            'Z');
    }
    buildEventDates(b) {
        const date = b.scheduledDate || '1970-01-01';
        const time = b.scheduledTime || '09:00';
        const iso = `${date}T${time.length === 5 ? time + ':00' : time}Z`;
        const start = new Date(iso);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        return { start, end };
    }
    generateIcs(bookings) {
        const lines = [];
        lines.push('BEGIN:VCALENDAR');
        lines.push('VERSION:2.0');
        lines.push('PRODID:-//Yapgitsin//Worker Calendar//TR');
        lines.push('CALSCALE:GREGORIAN');
        lines.push('METHOD:PUBLISH');
        lines.push('X-WR-CALNAME:Yapgitsin Takvim');
        lines.push('X-WR-TIMEZONE:Europe/Istanbul');
        const stamp = this.fmtUtc(new Date());
        for (const b of bookings) {
            const { start, end } = this.buildEventDates(b);
            if (isNaN(start.getTime()))
                continue;
            const summary = this.escapeText(`${b.category || 'Hizmet'}${b.subCategory ? ' - ' + b.subCategory : ''}`);
            const descParts = [
                b.description ? `Açıklama: ${b.description}` : '',
                b.customerNote ? `Müşteri Notu: ${b.customerNote}` : '',
                b.workerNote ? `Notum: ${b.workerNote}` : '',
                `Durum: ${b.status}`,
            ].filter(Boolean);
            const description = this.escapeText(descParts.join('\n'));
            const location = this.escapeText(b.address);
            const icsStatus = b.status === booking_entity_1.BookingStatus.CANCELLED
                ? 'CANCELLED'
                : b.status === booking_entity_1.BookingStatus.COMPLETED
                    ? 'CONFIRMED'
                    : 'CONFIRMED';
            lines.push('BEGIN:VEVENT');
            lines.push(this.foldLine(`UID:booking-${b.id}@yapgitsin.tr`));
            lines.push(`DTSTAMP:${stamp}`);
            lines.push(`DTSTART:${this.fmtUtc(start)}`);
            lines.push(`DTEND:${this.fmtUtc(end)}`);
            lines.push(this.foldLine(`SUMMARY:${summary}`));
            if (description)
                lines.push(this.foldLine(`DESCRIPTION:${description}`));
            if (location)
                lines.push(this.foldLine(`LOCATION:${location}`));
            lines.push(`STATUS:${icsStatus}`);
            lines.push('TRANSP:OPAQUE');
            lines.push('END:VEVENT');
        }
        lines.push('END:VCALENDAR');
        return lines.join('\r\n') + '\r\n';
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_entity_1.Booking)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map