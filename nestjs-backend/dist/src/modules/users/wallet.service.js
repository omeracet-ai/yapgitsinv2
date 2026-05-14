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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pdfkit_1 = __importDefault(require("pdfkit"));
const payment_entity_1 = require("../payments/payment.entity");
const payment_escrow_entity_1 = require("../escrow/payment-escrow.entity");
const user_entity_1 = require("./user.entity");
let WalletService = class WalletService {
    paymentRepo;
    escrowRepo;
    userRepo;
    BRAND_ORANGE = '#FF5A1F';
    BRAND_NAVY = '#2D3E50';
    constructor(paymentRepo, escrowRepo, userRepo) {
        this.paymentRepo = paymentRepo;
        this.escrowRepo = escrowRepo;
        this.userRepo = userRepo;
    }
    async generatePdf(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        const now = new Date();
        const since = new Date(now);
        since.setMonth(since.getMonth() - 12);
        const payments = await this.paymentRepo
            .createQueryBuilder('p')
            .where('p.customerId = :uid', { uid: userId })
            .andWhere('p.createdAt >= :since', { since })
            .andWhere('p.status IN (:...st)', {
            st: [payment_entity_1.PaymentStatus.COMPLETED, payment_entity_1.PaymentStatus.REFUNDED],
        })
            .orderBy('p.createdAt', 'DESC')
            .getMany()
            .catch(() => []);
        const escrows = await this.escrowRepo
            .createQueryBuilder('e')
            .where('e.customerId = :uid', { uid: userId })
            .andWhere('e.createdAt >= :since', { since })
            .orderBy('e.createdAt', 'DESC')
            .getMany()
            .catch(() => []);
        return this.renderPdf(user, payments, escrows, since, now);
    }
    renderPdf(user, payments, escrows, since, now) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (e) => reject(e));
            let totalPaid = 0;
            let totalRefund = 0;
            for (const p of payments) {
                if (p.status === payment_entity_1.PaymentStatus.COMPLETED)
                    totalPaid += p.amountMinor || 0;
                if (p.status === payment_entity_1.PaymentStatus.REFUNDED)
                    totalRefund += p.refundedAmountMinor || p.amountMinor || 0;
            }
            let activeEscrow = 0;
            for (const e of escrows) {
                if (e.status === payment_escrow_entity_1.EscrowStatus.HELD)
                    activeEscrow += e.amountMinor || 0;
            }
            doc.font('Helvetica-Bold').fontSize(20).fillColor(this.BRAND_ORANGE);
            doc.text('Yapgitsin Cuzdan Gecmisi', { align: 'left' });
            doc.moveDown(0.2);
            doc.font('Helvetica').fontSize(10).fillColor(this.BRAND_NAVY);
            doc.text(`Kullanici: ${user?.fullName ?? '-'}  |  ${user?.email ?? '-'}`);
            doc.text(`Tarih araligi: ${this.fmtDate(since)} - ${this.fmtDate(now)}`);
            doc.moveDown(0.5);
            doc
                .strokeColor(this.BRAND_ORANGE)
                .lineWidth(2)
                .moveTo(50, doc.y)
                .lineTo(545, doc.y)
                .stroke();
            doc.moveDown(0.7);
            doc.font('Helvetica-Bold').fontSize(13).fillColor(this.BRAND_NAVY);
            doc.text('Ozet');
            doc.moveDown(0.3);
            doc.font('Helvetica').fontSize(11).fillColor('black');
            doc.text(`Toplam Odenen:   ${this.fmtTl(totalPaid)}`);
            doc.text(`Toplam Iade:     ${this.fmtTl(totalRefund)}`);
            doc.text(`Aktif Escrow:    ${this.fmtTl(activeEscrow)}`);
            doc.moveDown(0.7);
            doc.font('Helvetica-Bold').fontSize(13).fillColor(this.BRAND_NAVY);
            doc.text('Detayli Hareketler');
            doc.moveDown(0.3);
            const colX = [50, 115, 280, 360, 430];
            const headers = ['Tarih', 'Aciklama', 'Tutar', 'Durum', 'Referans'];
            doc.font('Helvetica-Bold').fontSize(10).fillColor(this.BRAND_NAVY);
            headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { continued: i < headers.length - 1 }));
            doc.text('');
            doc
                .strokeColor('#cccccc')
                .lineWidth(0.5)
                .moveTo(50, doc.y + 1)
                .lineTo(545, doc.y + 1)
                .stroke();
            doc.moveDown(0.3);
            doc.font('Helvetica').fontSize(9).fillColor('black');
            const rows = [];
            for (const p of payments) {
                rows.push({
                    date: p.createdAt,
                    desc: p.description || 'Odeme',
                    amountMinor: p.amountMinor || 0,
                    status: p.status,
                    ref: (p.id || '').slice(0, 8),
                });
            }
            for (const e of escrows) {
                rows.push({
                    date: e.createdAt,
                    desc: 'Escrow',
                    amountMinor: e.amountMinor || 0,
                    status: e.status,
                    ref: (e.id || '').slice(0, 8),
                });
            }
            rows.sort((a, b) => b.date.getTime() - a.date.getTime());
            if (rows.length === 0) {
                doc.fillColor('#888').text('Bu donemde hareket bulunamadi.', 50);
            }
            else {
                for (const r of rows) {
                    if (doc.y > 740) {
                        doc.addPage();
                    }
                    const y = doc.y;
                    doc.text(this.fmtDate(r.date), colX[0], y, { width: 60 });
                    doc.text(r.desc.slice(0, 30), colX[1], y, { width: 160 });
                    doc.text(this.fmtTl(r.amountMinor), colX[2], y, { width: 75 });
                    doc.text(r.status, colX[3], y, { width: 65 });
                    doc.text(r.ref, colX[4], y, { width: 100 });
                    doc.moveDown(0.4);
                }
            }
            const range = doc.bufferedPageRange();
            for (let i = 0; i < range.count; i++) {
                doc.switchToPage(range.start + i);
                doc
                    .font('Helvetica')
                    .fontSize(8)
                    .fillColor('#777')
                    .text(`Olusturma: ${this.fmtDate(now)}  |  yapgitsin.tr  |  Sayfa ${i + 1}/${range.count}`, 50, 800, { align: 'center', width: 495 });
            }
            doc.end();
        });
    }
    fmtDate(d) {
        const dt = d instanceof Date ? d : new Date(d);
        return dt.toISOString().slice(0, 10);
    }
    fmtTl(minor) {
        const tl = (minor || 0) / 100;
        return `${tl.toFixed(2)} TL`;
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_escrow_entity_1.PaymentEscrow)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], WalletService);
//# sourceMappingURL=wallet.service.js.map