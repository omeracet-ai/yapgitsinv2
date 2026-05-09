import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import PDFDocument = require('pdfkit');
import { TokenTransaction } from './token-transaction.entity';
import { User } from '../users/user.entity';

@Injectable()
export class WalletPdfService {
  constructor(
    @InjectRepository(TokenTransaction)
    private txRepo: Repository<TokenTransaction>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async generatePdf(
    userId: string,
    from?: Date,
    to?: Date,
  ): Promise<Buffer> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    const where: FindOptionsWhere<TokenTransaction> = { userId };
    if (from && to) {
      where.createdAt = Between(from, to);
    }
    const txs = await this.txRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 500,
    });

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'portrait',
          margin: 40,
          font: 'Helvetica',
        });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const now = new Date();
        const fmt = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        // Header
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

        // User info
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

        // Balance summary
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

        // Table header
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

        const drawFooter = (pageNum: number) => {
          doc
            .fontSize(7)
            .fillColor('#999')
            .text(
              'KVKK: Bu belge 6698 sayili Kisisel Verilerin Korunmasi Kanunu kapsaminda yalnizca kullaniciya yoneliktir. Ucuncu sahislarla paylasilmasi yasaktir.',
              40,
              800,
              { width: 515, align: 'center' },
            );
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
        } else {
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
              .text(
                `${isCredit ? '+' : ''}${tx.amount}`,
                cols.amount + 5,
                y,
                { width: 65 },
              );
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
      } catch (err) {
        reject(err as Error);
      }
    });
  }
}
