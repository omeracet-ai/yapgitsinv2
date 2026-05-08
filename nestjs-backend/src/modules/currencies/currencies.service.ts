import { Injectable, OnModuleInit, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './currency.entity';

const SEED: Array<Pick<Currency, 'code' | 'symbol' | 'name' | 'rateToBase'>> = [
  { code: 'TRY', symbol: '₺', name: 'Türk Lirası', rateToBase: 1.0 },
  { code: 'USD', symbol: '$', name: 'US Dollar', rateToBase: 0.029 },
  { code: 'EUR', symbol: '€', name: 'Euro', rateToBase: 0.027 },
  { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', rateToBase: 0.05 },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', rateToBase: 14.5 },
  { code: 'UZS', symbol: 'soʼm', name: 'Uzbekistani Som', rateToBase: 365 },
];

@Injectable()
export class CurrenciesService implements OnModuleInit {
  constructor(
    @InjectRepository(Currency)
    private readonly repo: Repository<Currency>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(SEED.map((s) => this.repo.create({ ...s, isActive: true })));
    }
  }

  listActive() {
    return this.repo.find({ where: { isActive: true }, order: { code: 'ASC' } });
  }

  async findOne(code: string): Promise<Currency | null> {
    return this.repo.findOne({ where: { code: code.toUpperCase() } });
  }

  async setRate(code: string, rateToBase: number): Promise<Currency> {
    const cur = await this.findOne(code);
    if (!cur) throw new BadRequestException('currency not found');
    cur.rateToBase = rateToBase;
    return this.repo.save(cur);
  }

  // amount fromCode cinsinden → toCode cinsine çevir.
  // rateToBase: 1 TRY = rate * targetUnits (yani TRY-cinsi → target = amount * rateToBase).
  async convert(amount: number, fromCode: string, toCode: string): Promise<number> {
    const from = fromCode.toUpperCase();
    const to = toCode.toUpperCase();
    if (from === to) return amount;
    const fromCur = await this.findOne(from);
    const toCur = await this.findOne(to);
    if (!fromCur || !toCur) throw new BadRequestException('unknown currency');
    // Önce TRY base'e çevir: amount / fromCur.rateToBase = TRY tutar
    const inTry = fromCur.rateToBase === 0 ? 0 : amount / fromCur.rateToBase;
    // Sonra hedef currency'e: inTry * toCur.rateToBase
    return inTry * toCur.rateToBase;
  }

  async formatPrice(amount: number, code: string): Promise<string> {
    const cur = await this.findOne(code);
    const symbol = cur?.symbol ?? '₺';
    return `${amount.toFixed(2)} ${symbol}`;
  }
}
