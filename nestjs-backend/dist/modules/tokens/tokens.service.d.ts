import { Repository } from 'typeorm';
import { TokenTransaction, PaymentMethod } from './token-transaction.entity';
import { User } from '../users/user.entity';
export declare const OFFER_TOKEN_COST = 5;
export declare class TokensService {
    private txRepo;
    private userRepo;
    constructor(txRepo: Repository<TokenTransaction>, userRepo: Repository<User>);
    getBalance(userId: string): Promise<{
        balance: number;
    }>;
    getHistory(userId: string): Promise<TokenTransaction[]>;
    purchase(userId: string, amount: number, paymentMethod: PaymentMethod): Promise<TokenTransaction>;
    spend(userId: string, amount: number, description: string): Promise<void>;
}
