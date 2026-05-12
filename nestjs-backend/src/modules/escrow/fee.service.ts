import { Injectable } from '@nestjs/common';

export interface FeeBreakdown {
  /** Gross amount the customer pays (TRY). */
  gross: number;
  /** Platform fee percentage applied (e.g. 10 for 10%). */
  feePct: number;
  /** Platform service fee (commission) deducted from gross (TRY). */
  feeAmount: number;
  /** Net amount the worker receives after the platform fee (TRY). */
  workerNet: number;
}

/**
 * Phase 169 — Airtasker-style service-fee calculator.
 *
 * Single source of truth for the platform commission. Reads `PLATFORM_FEE_PCT`
 * (documented env, default 10). `PLATFORM_FEE_RATE` (0..1 fraction) is honored
 * for backwards compatibility with EscrowService and takes precedence when set.
 *
 * Returns plain JS numbers (rounded to 2 dp), consistent with the
 * `decimalTransformer` money pattern used across the codebase.
 */
@Injectable()
export class FeeService {
  /** Resolve the configured platform fee percentage (0..100). Fallback 10. */
  getFeePct(): number {
    const rate = process.env.PLATFORM_FEE_RATE;
    if (rate !== undefined && rate !== '') {
      const parsed = parseFloat(rate);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return Math.round(parsed * 100 * 100) / 100;
      }
    }
    const pct = parseFloat(process.env.PLATFORM_FEE_PCT ?? '10');
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return 10;
    return pct;
  }

  /**
   * Break a gross amount into platform fee + worker net.
   * @param grossAmount amount the customer pays (TRY).
   */
  calculateFee(grossAmount: number): FeeBreakdown {
    const gross = Number.isFinite(grossAmount) && grossAmount > 0 ? grossAmount : 0;
    const feePct = this.getFeePct();
    const feeAmount = Math.round(((gross * feePct) / 100) * 100) / 100;
    const workerNet = Math.round((gross - feeAmount) * 100) / 100;
    return { gross, feePct, feeAmount, workerNet };
  }
}
