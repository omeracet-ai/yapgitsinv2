import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Currency } from './currency.entity';
export declare class CurrenciesService implements OnModuleInit {
    private readonly repo;
    constructor(repo: Repository<Currency>);
    onModuleInit(): Promise<void>;
    listActive(): Promise<Currency[]>;
    findOne(code: string): Promise<Currency | null>;
    setRate(code: string, rateToBase: number): Promise<Currency>;
    convert(amount: number, fromCode: string, toCode: string): Promise<number>;
    formatPrice(amount: number, code: string): Promise<string>;
}
