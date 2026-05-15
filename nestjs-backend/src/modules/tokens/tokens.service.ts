import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  TokenTransaction,
  TxType,
  TxStatus,
  PaymentMethod,
} from './token-transaction.entity';
import { User } from '../users/user.entity';
import { Notification, NotificationType } from '../notifications/notification.entity';
import { GiftTokensDto } from './dto/gift-tokens.dto';
import { tlToMinor } from '../../common/money.util';
import { IyzipayService } from '../escrow/iyzipay.service';
import { TOKEN_PACKAGES, findPackage, TokenPackage } from './token-packages';

export const OFFER_TOKEN_COST = 5;
// Phase 174c — Integer minor (kuruş): 5 TL = 500 kuruş
export const OFFER_TOKEN_COST_MINOR = 500;

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    @InjectRepository(TokenTransaction)
    private txRepo: Repository<TokenTransaction>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
    private readonly iyzipay: IyzipayService,
  ) {}

  /** GET /tokens/packages — Flutter UI bunu çeker, paketleri hardcode etmez. */
  listPackages(): readonly TokenPackage[] {
    return TOKEN_PACKAGES;
  }

  /**
   * POST /tokens/checkout — paket için iyzipay checkout form başlatır.
   * 1. Paket id'yi doğrular (sunucu fiyatı server-side belirler, client gönderemez).
   * 2. PENDING bir TokenTransaction kaydı açar (paymentRef = iyzipay token).
   * 3. Frontend'e hosted ödeme sayfası URL'i döner.
   * Mock mode'da gerçek iyzipay çağrısı yok — yine de PENDING tx kaydı oluşur ve
   * mock token /tokens/iyzipay/callback ile credit'lenebilir (e2e + dev için).
   */
  async createIyzipayCheckout(
    userId: string,
    packageId: string,
    buyer: {
      name?: string;
      surname?: string;
      email?: string;
      gsmNumber?: string;
      ip?: string;
    } = {},
  ): Promise<{
    token: string;
    paymentPageUrl: string | null;
    checkoutFormContent: string | null;
    mock: boolean;
    package: TokenPackage;
  }> {
    const pkg = findPackage(packageId);
    if (!pkg) throw new BadRequestException('Geçersiz paket');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    // priceMinor (kuruş) → TL float SADECE iyzipay isteğinde (SDK string istiyor).
    const priceTL = pkg.priceMinor / 100;

    const refId = `tokpurchase_${userId}_${pkg.id}_${Date.now()}`;
    const cf = await this.iyzipay.createCheckoutForm({
      refId,
      gross: priceTL,
      callbackUrl: `${(process.env.APP_BASE_URL || 'https://yapgitsin.tr').replace(/\/$/, '')}/backend/tokens/iyzipay/callback`,
      buyer: {
        id: userId,
        name: buyer.name || user.fullName?.split(' ')[0] || 'Yapgitsin',
        surname:
          buyer.surname || user.fullName?.split(' ').slice(1).join(' ') || 'Kullanici',
        email: buyer.email || user.email || 'customer@yapgitsin.tr',
        gsmNumber: buyer.gsmNumber || '+905350000000',
        ip: buyer.ip,
      },
      itemName: pkg.label,
    });

    // PENDING tx — callback'te COMPLETED yapacağız. paymentRef = iyzipay token (re-verify için).
    await this.txRepo.save(
      this.txRepo.create({
        userId,
        type: TxType.PURCHASE,
        amount: pkg.tokens,
        amountMinor: pkg.priceMinor,
        description: `${pkg.label} satın alma (iyzipay) — beklemede`,
        status: TxStatus.PENDING,
        paymentMethod: PaymentMethod.IYZIPAY,
        paymentRef: cf.token,
      }),
    );

    return {
      token: cf.token,
      paymentPageUrl: cf.paymentPageUrl,
      checkoutFormContent: cf.checkoutFormContent,
      mock: cf.mock,
      package: pkg,
    };
  }

  /**
   * POST /tokens/iyzipay/callback — iyzipay POST eder.
   * Server-side token re-verify, idempotent credit (tx zaten COMPLETED ise no-op).
   */
  async confirmIyzipayCheckout(
    token: string,
  ): Promise<{ status: 'success' | 'failure'; tokens?: number; balance?: number }> {
    if (!token) throw new BadRequestException('Missing token');

    const tx = await this.txRepo.findOne({ where: { paymentRef: token } });
    if (!tx) throw new NotFoundException('İşlem bulunamadı');

    // İdempotency: zaten COMPLETED veya FAILED ise no-op.
    if (tx.status === TxStatus.COMPLETED) {
      const u = await this.userRepo.findOne({ where: { id: tx.userId } });
      return { status: 'success', tokens: tx.amount, balance: u?.tokenBalance ?? 0 };
    }
    if (tx.status === TxStatus.FAILED) {
      return { status: 'failure' };
    }

    const result = await this.iyzipay.retrieveCheckout(token);
    if (result.status !== 'SUCCESS') {
      tx.status = TxStatus.FAILED;
      tx.description = `${tx.description} — iyzipay FAILURE`;
      await this.txRepo.save(tx);
      return { status: 'failure' };
    }

    // Para alındı — bakiyeyi credit et, tx'i COMPLETED yap.
    return this.dataSource.transaction(async (manager) => {
      const fresh = await manager.findOne(TokenTransaction, { where: { id: tx.id } });
      if (!fresh) throw new NotFoundException('İşlem bulunamadı (race)');
      if (fresh.status === TxStatus.COMPLETED) {
        const u = await manager.findOne(User, { where: { id: fresh.userId } });
        return {
          status: 'success' as const,
          tokens: fresh.amount,
          balance: u?.tokenBalance ?? 0,
        };
      }
      await manager.increment(User, { id: fresh.userId }, 'tokenBalance', fresh.amount);
      fresh.status = TxStatus.COMPLETED;
      fresh.description = `${fresh.amount} jeton satın alındı (iyzipay paymentId=${result.paymentId ?? 'n/a'})`;
      await manager.save(TokenTransaction, fresh);
      const u = await manager.findOne(User, { where: { id: fresh.userId } });
      this.logger.log(
        `Token purchase confirmed: user=${fresh.userId} tokens=${fresh.amount} paymentId=${result.paymentId ?? 'n/a'}`,
      );
      return {
        status: 'success' as const,
        tokens: fresh.amount,
        balance: u?.tokenBalance ?? 0,
      };
    });
  }

  async giftTokens(
    senderId: string,
    dto: GiftTokensDto,
  ): Promise<{
    senderBalance: number;
    recipientBalance: number;
    amount: number;
    recipientName: string;
  }> {
    if (senderId === dto.recipientId) {
      throw new BadRequestException('Kendine token hediye edemezsin');
    }
    const amount = dto.amount;
    const note = dto.note ?? '';

    return this.dataSource.transaction(async (manager) => {
      const sender = await manager.findOne(User, { where: { id: senderId } });
      if (!sender) throw new NotFoundException('Gönderen bulunamadı');
      const recipient = await manager.findOne(User, {
        where: { id: dto.recipientId },
      });
      if (!recipient) throw new NotFoundException('Alıcı bulunamadı');
      if (sender.tokenBalance < amount) {
        throw new BadRequestException(
          `Yetersiz bakiye. Gerekli: ${amount}, Mevcut: ${sender.tokenBalance}`,
        );
      }

      sender.tokenBalance = sender.tokenBalance - amount;
      recipient.tokenBalance = recipient.tokenBalance + amount;
      await manager.save(User, sender);
      await manager.save(User, recipient);

      // Phase 174c — Integer minor sync
      const amountMinor = tlToMinor(amount) ?? 0;
      await manager.save(TokenTransaction, [
        manager.create(TokenTransaction, {
          userId: senderId,
          type: TxType.SPEND,
          amount: -amount,
          amountMinor: -amountMinor,
          description: `Hediye → ${recipient.fullName}: ${note}`.trim(),
          status: TxStatus.COMPLETED,
          paymentMethod: PaymentMethod.SYSTEM,
          paymentRef: `GIFT-${Date.now()}`,
        }),
        manager.create(TokenTransaction, {
          userId: recipient.id,
          type: TxType.PURCHASE,
          amount: amount,
          amountMinor,
          description: `Hediye ← ${sender.fullName}: ${note}`.trim(),
          status: TxStatus.COMPLETED,
          paymentMethod: PaymentMethod.SYSTEM,
          paymentRef: `GIFT-${Date.now()}`,
        }),
      ]);

      await manager.save(
        Notification,
        manager.create(Notification, {
          userId: recipient.id,
          type: NotificationType.SYSTEM,
          title: 'Token Hediyesi',
          body: `${sender.fullName} size ${amount} token gönderdi${note ? `: ${note}` : ''}`,
          refId: senderId,
        }),
      );

      return {
        senderBalance: sender.tokenBalance,
        recipientBalance: recipient.tokenBalance,
        amount,
        recipientName: recipient.fullName,
      };
    });
  }

  async getBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return { balance: user?.tokenBalance ?? 0 };
  }

  async getHistory(userId: string): Promise<TokenTransaction[]> {
    return this.txRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async purchase(
    userId: string,
    amount: number,
    paymentMethod: PaymentMethod,
  ): Promise<TokenTransaction> {
    if (amount <= 0) throw new BadRequestException('Geçersiz miktar');

    await this.userRepo.increment({ id: userId }, 'tokenBalance', amount);

    const tx = this.txRepo.create({
      userId,
      type: TxType.PURCHASE,
      amount,
      amountMinor: tlToMinor(amount) ?? 0,
      description: `${amount} token satın alındı (${paymentMethod === PaymentMethod.BANK ? 'Banka' : 'Kripto'})`,
      status: TxStatus.COMPLETED,
      paymentMethod,
      paymentRef: `REF-${Date.now()}`,
    });
    return this.txRepo.save(tx);
  }

  async spend(
    userId: string,
    amount: number,
    description: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.tokenBalance < amount) {
      throw new BadRequestException(
        `Yetersiz token bakiyesi. Gerekli: ${amount}, Mevcut: ${user?.tokenBalance ?? 0}`,
      );
    }

    await this.userRepo.decrement({ id: userId }, 'tokenBalance', amount);

    await this.txRepo.save(
      this.txRepo.create({
        userId,
        type: TxType.SPEND,
        amount,
        amountMinor: tlToMinor(amount) ?? 0,
        description,
        status: TxStatus.COMPLETED,
        paymentMethod: null,
        paymentRef: null,
      }),
    );
  }
}
