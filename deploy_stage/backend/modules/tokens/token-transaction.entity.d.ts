import { User } from '../users/user.entity';
export declare enum TxType {
    PURCHASE = "purchase",
    SPEND = "spend",
    REFUND = "refund"
}
export declare enum PaymentMethod {
    BANK = "bank",
    CRYPTO = "crypto",
    SYSTEM = "system"
}
export declare enum TxStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare class TokenTransaction {
    id: string;
    userId: string;
    user: User;
    type: TxType;
    amount: number;
    description: string;
    status: TxStatus;
    paymentMethod: PaymentMethod | null;
    paymentRef: string | null;
    createdAt: Date;
}
