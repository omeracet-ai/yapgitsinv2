import { Repository } from 'typeorm';
import { TokenTransaction } from './token-transaction.entity';
import { User } from '../users/user.entity';
export declare class WalletPdfService {
    private txRepo;
    private userRepo;
    constructor(txRepo: Repository<TokenTransaction>, userRepo: Repository<User>);
    generatePdf(userId: string, from?: Date, to?: Date): Promise<Buffer>;
}
