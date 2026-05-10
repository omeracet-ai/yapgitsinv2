import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

export const OFFER_TOKEN_COST = 5;
// Phase 174c — Integer minor (kuruş): 5 TL = 500 kuruş
export const OFFER_TOKEN_COST_MINOR = 500;

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(TokenTransaction)
    private txRepo: Repository<TokenTransaction>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

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
