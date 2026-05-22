import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CryptoDeposit,
  CryptoDepositStatus,
  CryptoDepositPurpose,
} from './crypto-deposit.entity';
import { CreateCryptoDepositDto } from './dto/create-crypto-deposit.dto';
import { ReviewCryptoDepositDto } from './dto/review-crypto-deposit.dto';
import { TokensService } from '../tokens/tokens.service';

/** Hesap yatırım cüzdanı — borsadan buraya USDT-TRC20 gönderilir. */
export function getDepositWallet() {
  return {
    network: 'TRC20',
    asset: 'USDT',
    address:
      process.env.USDT_TRC20_ADDRESS ||
      'TGsyzSQ8dnXEmkbAQ2w3E33f63DVCYrop4',
    note:
      'Yalnızca USDT (TRC-20 / TRON ağı) gönderin. Farklı ağ veya coin gönderimi kaybolur.',
  };
}

@Injectable()
export class CryptoDepositsService {
  private readonly logger = new Logger(CryptoDepositsService.name);

  constructor(
    @InjectRepository(CryptoDeposit)
    private readonly repo: Repository<CryptoDeposit>,
    private readonly tokensService: TokensService,
  ) {}

  getAddress() {
    return getDepositWallet();
  }

  async create(userId: string, dto: CreateCryptoDepositDto) {
    const txId = dto.txId.trim();
    // Aynı TxID ile mükerrer talep engeli (çift kredi riskine karşı ilk savunma).
    const existing = await this.repo.findOne({ where: { txId } });
    if (existing) {
      throw new BadRequestException(
        'Bu işlem hash (TxID) zaten kayıtlı. Tekrar göndermeyin.',
      );
    }
    const deposit = this.repo.create({
      userId,
      tenantId: null,
      network: 'TRC20',
      asset: 'USDT',
      amountUsdt: dto.amountUsdt,
      txId,
      creditAmount: dto.creditAmount,
      purpose:
        dto.purpose === 'wallet'
          ? CryptoDepositPurpose.WALLET
          : CryptoDepositPurpose.TOKEN,
      status: CryptoDepositStatus.PENDING,
    });
    const saved = await this.repo.save(deposit);
    return { deposit: saved, wallet: getDepositWallet() };
  }

  async listMine(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async adminList(status?: string) {
    const where =
      status && ['pending', 'approved', 'rejected'].includes(status)
        ? { status: status as CryptoDepositStatus }
        : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 500 });
  }

  /**
   * Onayla → atomik pending→approved geçişi (çift kredi engeli), sonra Kredi yükle.
   * adminGrant başarısız olursa pending'e geri al (retry edilebilir kalsın).
   */
  async approve(id: string, adminId: string, dto: ReviewCryptoDepositDto) {
    const deposit = await this.repo.findOne({ where: { id } });
    if (!deposit) throw new NotFoundException('Yatırım kaydı bulunamadı');
    if (deposit.status !== CryptoDepositStatus.PENDING) {
      throw new BadRequestException(
        `Bu kayıt zaten işlenmiş (durum: ${deposit.status})`,
      );
    }
    const credit = dto.creditAmount ?? deposit.creditAmount;
    if (!Number.isInteger(credit) || credit < 1) {
      throw new BadRequestException('Geçersiz Kredi miktarı');
    }

    // Atomik durum geçişi — yalnızca hâlâ pending ise (çift onayı önler).
    const now = new Date();
    const res = await this.repo
      .createQueryBuilder()
      .update(CryptoDeposit)
      .set({
        status: CryptoDepositStatus.APPROVED,
        creditAmount: credit,
        reviewedByAdminId: adminId,
        reviewedAt: now,
        adminNote: dto.note ?? null,
      })
      .where('id = :id AND status = :pending', {
        id,
        pending: CryptoDepositStatus.PENDING,
      })
      .execute();
    if (!res.affected) {
      throw new BadRequestException('Kayıt eşzamanlı olarak işlenmiş');
    }

    try {
      const reason = `USDT-TRC20 yatırım onayı (${deposit.amountUsdt} USDT, TxID ${deposit.txId})`;
      const grant = await this.tokensService.adminGrant(
        deposit.userId,
        credit,
        reason,
        adminId,
      );
      this.logger.warn(
        `[crypto-deposit] approved ${id} → +${credit} Kredi (user ${deposit.userId}, tx ${deposit.txId})`,
      );
      return {
        ...deposit,
        status: CryptoDepositStatus.APPROVED,
        creditAmount: credit,
        reviewedAt: now,
        newBalance: grant.balance,
      };
    } catch (e) {
      // Kredi yüklenemedi → onayı geri al, tekrar denenebilsin.
      await this.repo.update(id, {
        status: CryptoDepositStatus.PENDING,
        reviewedByAdminId: null,
        reviewedAt: null,
      });
      this.logger.error(
        `[crypto-deposit] approve credit failed ${id}: ${(e as Error).message} — reverted to pending`,
      );
      throw e;
    }
  }

  async reject(id: string, adminId: string, dto: ReviewCryptoDepositDto) {
    const deposit = await this.repo.findOne({ where: { id } });
    if (!deposit) throw new NotFoundException('Yatırım kaydı bulunamadı');
    if (deposit.status !== CryptoDepositStatus.PENDING) {
      throw new BadRequestException(
        `Bu kayıt zaten işlenmiş (durum: ${deposit.status})`,
      );
    }
    deposit.status = CryptoDepositStatus.REJECTED;
    deposit.reviewedByAdminId = adminId;
    deposit.reviewedAt = new Date();
    deposit.adminNote = dto.note ?? null;
    return this.repo.save(deposit);
  }
}
