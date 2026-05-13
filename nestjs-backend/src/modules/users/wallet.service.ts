import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Payment, PaymentStatus } from '../payments/payment.entity';
import { PaymentEscrow, EscrowStatus } from '../escrow/payment-escrow.entity';
import { User } from './user.entity';

/**
 * Phase 180 — Customer wallet PDF export.
 *
 * Aggregates the authenticated user's payments + escrow rows from the last
 * 12 months and renders a Yapgitsin-branded PDF (summary + detail table).
 */
@Injectable()
export class WalletService {
  // Yapgitsin brand
  private readonly BRAND_ORANGE = '#FF5A1F';
  private readonly BRAND_NAVY = '#2D3E50';

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentEscrow)
    private readonly escrowRepo: Repository<PaymentEscrow>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async generatePdf(userId: string): Promise<Buffer> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const now = new Date();
    const since = new Date(now);
    since.setMonth(since.getMonth() - 12);

    const payments = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.customerId = :uid', { uid: userId })
      .andWhere('p.createdAt >= :since', { since })
      .andWhere('p.status IN (:...st)', {
        st: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED],
      })
      .orderBy('p.createdAt', 'DESC')
      .getMany()
      .catch(() => [] as Payment[]);

    const escrows = await this.escrowRepo
      .createQueryBuilder('e')
      .where('e.customerId = :uid', { uid: userId })
      .andWhere('e.createdAt >= :since', { since })
      .orderBy('e.createdAt', 'DESC')
      .getMany()
      .catch(() => [] as PaymentEscrow[]);

    return this.renderPdf(user, payments, escrows, since, now);
  }

  private renderPdf(
    user: User | null,
    payments: Payment[],
    escrows: PaymentEscrow[],
    since: Date,
    now: Date,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e: Error) => reject(e));

      // Totals (minor units, kuruş)
      let totalPaid = 0;
      let totalRefund = 0;
      for (const p of payments) {
        if (p.status === PaymentStatus.COMPLETED) totalPaid += p.amountMinor || 0;
        if (p.status === PaymentStatus.REFUNDED)
          totalRefund += p.refundedAmountMinor || p.amountMinor || 0;
      }
      let activeEscrow = 0;
      for (const e of escrows) {
        if (e.status === EscrowStatus.HELD) activeEscrow += e.amountMinor || 0;
      }

      // Header
      doc.font('Helvetica-Bold').fontSize(20).fillColor(this.BRAND_ORANGE);
      doc.text('Yapgitsin Cuzdan Gecmisi', { align: 'left' });
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(10).fillColor(this.BRAND_NAVY);
      doc.text(`Kullanici: ${user?.fullName ?? '-'}  |  ${user?.email ?? '-'}`);
      doc.text(
        `Tarih araligi: ${this.fmtDate(since)} - ${this.fmtDate(now)}`,
      );
      doc.moveDown(0.5);
      doc
        .strokeColor(this.BRAND_ORANGE)
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();
      doc.moveDown(0.7);

      // Summary
      doc.font('Helvetica-Bold').fontSize(13).fillColor(this.BRAND_NAVY);
      doc.text('Ozet');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(11).fillColor('black');
      doc.text(`Toplam Odenen:   ${this.fmtTl(totalPaid)}`);
      doc.text(`Toplam Iade:     ${this.fmtTl(totalRefund)}`);
      doc.text(`Aktif Escrow:    ${this.fmtTl(activeEscrow)}`);
      doc.moveDown(0.7);

      // Detail
      doc.font('Helvetica-Bold').fontSize(13).fillColor(this.BRAND_NAVY);
      doc.text('Detayli Hareketler');
      doc.moveDown(0.3);

      // Table header
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

      type Row = {
        date: Date;
        desc: string;
        amountMinor: number;
        status: string;
        ref: string;
      };
      const rows: Row[] = [];
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
      } else {
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

      // Footer on each page
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#777')
          .text(
            `Olusturma: ${this.fmtDate(now)}  |  yapgitsin.tr  |  Sayfa ${i + 1}/${range.count}`,
            50,
            800,
            { align: 'center', width: 495 },
          );
      }

      doc.end();
    });
  }

  private fmtDate(d: Date): string {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().slice(0, 10);
  }

  private fmtTl(minor: number): string {
    const tl = (minor || 0) / 100;
    return `${tl.toFixed(2)} TL`;
  }
}
