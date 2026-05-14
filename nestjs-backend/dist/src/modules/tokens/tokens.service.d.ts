import { DataSource, Repository } from 'typeorm';
import { TokenTransaction, PaymentMethod } from './token-transaction.entity';
import { User } from '../users/user.entity';
import { GiftTokensDto } from './dto/gift-tokens.dto';
export declare const OFFER_TOKEN_COST = 5;
export declare const OFFER_TOKEN_COST_MINOR = 500;
export declare class TokensService {
    private txRepo;
    private userRepo;
    private dataSource;
    constructor(txRepo: Repository<TokenTransaction>, userRepo: Repository<User>, dataSource: DataSource);
    giftTokens(senderId: string, dto: GiftTokensDto): Promise<{
        senderBalance: number;
        recipientBalance: number;
        amount: number;
        recipientName: string;
    }>;
    getBalance(userId: string): Promise<{
        balance: number;
    }>;
    getHistory(userId: string): Promise<TokenTransaction[]>;
    purchase(userId: string, amount: number, paymentMethod: PaymentMethod): Promise<TokenTransaction>;
    spend(userId: string, amount: number, description: string): Promise<void>;
}
