import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenTransaction, TxType, TxStatus, PaymentMethod } from './token-transaction.entity';
import { User } from '../users/user.entity';

export const OFFER_TOKEN_COST = 5;

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(TokenTransaction) private txRepo: Repository<TokenTransaction>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

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

  async purchase(userId: string, amount: number, paymentMethod: PaymentMethod): Promise<TokenTransaction> {
    if (amount <= 0) throw new BadRequestException('Geçersiz miktar');

    await this.userRepo.increment({ id: userId }, 'tokenBalance', amount);

    const tx = this.txRepo.create({
      userId,
      type: TxType.PURCHASE,
      amount,
      description: `${amount} token satın alındı (${paymentMethod === PaymentMethod.BANK ? 'Banka' : 'Kripto'})`,
      status: TxStatus.COMPLETED,
      paymentMethod,
      paymentRef: `REF-${Date.now()}`,
    });
    return this.txRepo.save(tx);
  }

  async spend(userId: string, amount: number, description: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.tokenBalance < amount) {
      throw new BadRequestException(`Yetersiz token bakiyesi. Gerekli: ${amount}, Mevcut: ${user?.tokenBalance ?? 0}`);
    }

    await this.userRepo.decrement({ id: userId }, 'tokenBalance', amount);

    await this.txRepo.save(this.txRepo.create({
      userId,
      type: TxType.SPEND,
      amount,
      description,
      status: TxStatus.COMPLETED,
      paymentMethod: null,
      paymentRef: null,
    }));
  }
}
