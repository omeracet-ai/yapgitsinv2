export interface FeeBreakdown {
    gross: number;
    feePct: number;
    feeAmount: number;
    workerNet: number;
}
export declare class FeeService {
    getFeePct(): number;
    calculateFee(grossAmount: number): FeeBreakdown;
}
