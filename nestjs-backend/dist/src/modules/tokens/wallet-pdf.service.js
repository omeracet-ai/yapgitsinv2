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
exports.WalletPdfService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const PDFDocument = require("pdfkit");
const token_transaction_entity_1 = require("./token-transaction.entity");
const user_entity_1 = require("../users/user.entity");
let WalletPdfService = class WalletPdfService {
    txRepo;
    userRepo;
    constructor(txRepo, userRepo) {
        this.txRepo = txRepo;
        this.userRepo = userRepo;
    }
    async generatePdf(userId, from, to) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Kullanıcı bulunamadı');
        const where = { userId };
        if (from && to) {
            where.createdAt = (0, typeorm_2.Between)(from, to);
        }
        const txs = await this.txRepo.find({
            where,
            order: { createdAt: 'DESC' },
            take: 500,
        });
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    layout: 'portrait',
                    margin: 40,
                    font: 'Helvetica',
                });
                const chunks = [];
                doc.on('data', (c) => chunks.push(c));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);
                const now = new Date();
                const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                doc
                    .fillColor('#007DFE')
                    .fontSize(22)
                    .text('Yapgitsin', 40, 40, { continued: true })
                    .fillColor('#2D3E50')
                    .fontSize(12)
                    .text('  - Cuzdan Hareketleri', { continued: false });
                doc
                    .fontSize(9)
                    .fillColor('#666')
                    .text(`Olusturulma: ${fmt(now)}`, 40, 70);
                doc
                    .moveTo(40, 90)
                    .lineTo(555, 90)
                    .strokeColor('#007DFE')
                    .lineWidth(1)
                    .stroke();
                let y = 110;
                doc.fillColor('#2D3E50').fontSize(11).text('Kullanici Bilgileri', 40, y);
                y += 18;
                doc
                    .fontSize(10)
                    .fillColor('#000')
                    .text(`Ad Soyad: ${user.fullName ?? '-'}`, 40, y);
                y += 14;
                doc.text(`Telefon: ${user.phoneNumber ?? '-'}`, 40, y);
                y += 14;
                const memberSince = user.createdAt
                    ? fmt(new Date(user.createdAt))
                    : '-';
                doc.text(`Uyelik Tarihi: ${memberSince}`, 40, y);
                y += 14;
                if (from && to) {
                    doc.text(`Donem: ${fmt(from)} - ${fmt(to)}`, 40, y);
                    y += 14;
                }
                y += 8;
                doc
                    .roundedRect(40, y, 515, 50, 8)
                    .fillColor('#E5F2FF')
                    .fill();
                doc
                    .fillColor('#0056B3')
                    .fontSize(11)
                    .text('Mevcut Bakiye', 55, y + 10);
                doc
                    .fontSize(20)
                    .fillColor('#007DFE')
                    .text(`${user.tokenBalance ?? 0} Token`, 55, y + 24);
                y += 70;
                doc.fillColor('#2D3E50').fontSize(11).text('Islem Gecmisi', 40, y);
                y += 18;
                const cols = { date: 40, type: 170, amount: 270, status: 340, desc: 410 };
                doc
                    .rect(40, y, 515, 20)
                    .fillColor('#F0F4F8')
                    .fill();
                doc
                    .fillColor('#2D3E50')
                    .fontSize(9)
                    .text('Tarih', cols.date + 5, y + 6)
                    .text('Tip', cols.type + 5, y + 6)
                    .text('Miktar', cols.amount + 5, y + 6)
                    .text('Durum', cols.status + 5, y + 6)
                    .text('Aciklama', cols.desc + 5, y + 6);
                y += 22;
                const drawFooter = (pageNum) => {
                    doc
                        .fontSize(7)
                        .fillColor('#999')
                        .text('KVKK: Bu belge 6698 sayili Kisisel Verilerin Korunmasi Kanunu kapsaminda yalnizca kullaniciya yoneliktir. Ucuncu sahislarla paylasilmasi yasaktir.', 40, 800, { width: 515, align: 'center' });
                    doc.text(`Sayfa ${pageNum}`, 40, 815, {
                        width: 515,
                        align: 'right',
                    });
                };
                let pageNum = 1;
                drawFooter(pageNum);
                if (txs.length === 0) {
                    doc
                        .fillColor('#999')
                        .fontSize(10)
                        .text('Bu donem icin islem bulunamadi.', 40, y + 10, {
                        width: 515,
                        align: 'center',
                    });
                }
                else {
                    for (const tx of txs) {
                        if (y > 770) {
                            doc.addPage();
                            pageNum++;
                            y = 40;
                            drawFooter(pageNum);
                        }
                        const isCredit = tx.amount > 0;
                        doc.fillColor('#000').fontSize(8);
                        doc.text(fmt(new Date(tx.createdAt)), cols.date + 5, y, {
                            width: 125,
                        });
                        doc.text(tx.type, cols.type + 5, y, { width: 95 });
                        doc
                            .fillColor(isCredit ? '#00C9A7' : '#DE4437')
                            .text(`${isCredit ? '+' : ''}${tx.amount}`, cols.amount + 5, y, { width: 65 });
                        doc.fillColor('#000').text(tx.status, cols.status + 5, y, {
                            width: 65,
                        });
                        doc.text(tx.description ?? '-', cols.desc + 5, y, {
                            width: 140,
                            ellipsis: true,
                        });
                        y += 16;
                    }
                }
                doc.end();
            }
            catch (err) {
                reject(err);
            }
        });
    }
};
exports.WalletPdfService = WalletPdfService;
exports.WalletPdfService = WalletPdfService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(token_transaction_entity_1.TokenTransaction)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], WalletPdfService);
//# sourceMappingURL=wallet-pdf.service.js.map