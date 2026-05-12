/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

// iyzipay official Node SDK (CommonJS)
const Iyzipay = require('iyzipay');

export interface CheckoutFormResult {
  /** Iyzipay checkout form token (use with retrieveCheckout). */
  token: string;
  /** Hosted payment page URL the customer is redirected to. */
  paymentPageUrl: string | null;
  /** Inline checkout form HTML/JS snippet (alternative to redirect). */
  checkoutFormContent: string | null;
  /** True when running in mock mode (no live iyzipay call was made). */
  mock: boolean;
}

export interface RetrieveResult {
  /** 'SUCCESS' | 'FAILURE' (iyzipay paymentStatus / status). */
  status: 'SUCCESS' | 'FAILURE';
  /** Iyzipay paymentId (used for refunds). */
  paymentId: string | null;
  /** Iyzipay paymentTransactionId (used for item-level refunds). */
  paymentTransactionId: string | null;
  raw?: any;
}

export interface RefundResult {
  status: 'success' | 'failure';
  refundId: string | null;
  error?: string;
}

interface CreateCheckoutArgs {
  /** Booking/job/escrow id used as basketId + conversationId. */
  refId: string;
  /** Gross amount the customer pays (TRY). */
  gross: number;
  /** Where iyzipay POSTs the result token after payment. */
  callbackUrl: string;
  buyer?: {
    id?: string;
    name?: string;
    surname?: string;
    email?: string;
    gsmNumber?: string;
    identityNumber?: string;
    ip?: string;
    city?: string;
    country?: string;
    address?: string;
    zipCode?: string;
  };
  itemName?: string;
}

/**
 * Phase 175 — real iyzipay (Turkey card / 3D Secure) payment integration.
 *
 * Wraps the official `iyzipay` Node SDK. When `MOCK_IYZIPAY=1` (or iyzipay
 * credentials are missing) the service returns deterministic fake responses so
 * the booking/escrow flow and e2e tests work without live sandbox keys.
 *
 * SECURITY: the iyzipay secret key is only read from env and passed to the SDK
 * constructor — it is never logged or returned in any response.
 */
@Injectable()
export class IyzipayService {
  private readonly logger = new Logger(IyzipayService.name);
  private client: any = null;
  readonly mockMode: boolean;

  constructor() {
    const apiKey = process.env.IYZIPAY_API_KEY;
    const secretKey = process.env.IYZIPAY_SECRET_KEY;
    const uri = process.env.IYZIPAY_URI || 'https://sandbox-api.iyzipay.com';
    const placeholder =
      !apiKey ||
      !secretKey ||
      apiKey.startsWith('change_me') ||
      secretKey.startsWith('change_me');

    this.mockMode = process.env.MOCK_IYZIPAY === '1' || placeholder;

    if (!this.mockMode) {
      try {
        this.client = new Iyzipay({ apiKey, secretKey, uri });
        this.logger.log(`iyzipay initialised (uri=${uri})`);
      } catch (err) {
        this.logger.error(
          `iyzipay init failed, falling back to mock: ${(err as Error).message}`,
        );
        // keep mockMode getter consistent
        (this as { mockMode: boolean }).mockMode = true;
      }
    } else {
      this.logger.warn(
        'iyzipay running in MOCK mode (set MOCK_IYZIPAY=0 + real keys to go live)',
      );
    }
  }

  /** Default callbackUrl used by createCheckoutForm callers. */
  static callbackUrl(): string {
    const base = process.env.APP_BASE_URL || 'https://yapgitsin.tr';
    return `${base.replace(/\/$/, '')}/backend/payments/iyzipay/callback`;
  }

  /**
   * Iyzipay Checkout Form Initialize. Returns a token + hosted payment page URL.
   * The customer pays on iyzipay's page; iyzipay then POSTs the token to callbackUrl.
   */
  async createCheckoutForm(args: CreateCheckoutArgs): Promise<CheckoutFormResult> {
    const priceStr = args.gross.toFixed(2);
    if (this.mockMode || !this.client) {
      const token = `mock_cf_${args.refId}_${Date.now()}`;
      return {
        token,
        paymentPageUrl: `https://sandbox-cpp.iyzipay.com/?token=${token}`,
        checkoutFormContent: `<!-- mock iyzipay checkout form for ${args.refId} -->`,
        mock: true,
      };
    }

    const b = args.buyer ?? {};
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: args.refId,
      price: priceStr,
      paidPrice: priceStr,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: args.refId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.SUBSCRIPTION,
      callbackUrl: args.callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id: b.id || args.refId,
        name: b.name || 'Yapgitsin',
        surname: b.surname || 'Customer',
        gsmNumber: b.gsmNumber || '+905350000000',
        email: b.email || 'customer@yapgitsin.tr',
        identityNumber: b.identityNumber || '11111111111',
        lastLoginDate: nowStr,
        registrationDate: nowStr,
        registrationAddress: b.address || 'Istanbul',
        ip: b.ip || '85.34.78.112',
        city: b.city || 'Istanbul',
        country: b.country || 'Turkey',
        zipCode: b.zipCode || '34000',
      },
      shippingAddress: {
        contactName: `${b.name || 'Yapgitsin'} ${b.surname || 'Customer'}`,
        city: b.city || 'Istanbul',
        country: b.country || 'Turkey',
        address: b.address || 'Istanbul',
        zipCode: b.zipCode || '34000',
      },
      billingAddress: {
        contactName: `${b.name || 'Yapgitsin'} ${b.surname || 'Customer'}`,
        city: b.city || 'Istanbul',
        country: b.country || 'Turkey',
        address: b.address || 'Istanbul',
        zipCode: b.zipCode || '34000',
      },
      basketItems: [
        {
          id: args.refId,
          name: args.itemName || 'Hizmet Ödemesi',
          category1: 'Hizmet',
          itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
          price: priceStr,
        },
      ],
    };

    return new Promise<CheckoutFormResult>((resolve, reject) => {
      this.client.checkoutFormInitialize.create(request, (err: any, result: any) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        if (result && result.status === 'failure') {
          reject(new Error(result.errorMessage || 'iyzipay checkout init failed'));
          return;
        }
        resolve({
          token: result.token,
          paymentPageUrl: result.paymentPageUrl ?? null,
          checkoutFormContent: result.checkoutFormContent ?? null,
          mock: false,
        });
      });
    });
  }

  /** Iyzipay Checkout Form Retrieve — verifies the payment result for a token. */
  async retrieveCheckout(token: string): Promise<RetrieveResult> {
    if (this.mockMode || !this.client) {
      // Mock: a token containing "fail" => FAILURE, else SUCCESS.
      const ok = !/fail/i.test(token);
      return {
        status: ok ? 'SUCCESS' : 'FAILURE',
        paymentId: ok ? `mock_pid_${token}` : null,
        paymentTransactionId: ok ? `mock_ptid_${token}` : null,
      };
    }
    return new Promise<RetrieveResult>((resolve, reject) => {
      this.client.checkoutForm.retrieve(
        { locale: Iyzipay.LOCALE.TR, token },
        (err: any, result: any) => {
          if (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
            return;
          }
          const success =
            result &&
            result.status === 'success' &&
            (result.paymentStatus === 'SUCCESS' ||
              result.paymentStatus === undefined);
          let ptid: string | null = null;
          if (
            result &&
            Array.isArray(result.itemTransactions) &&
            result.itemTransactions.length > 0
          ) {
            ptid = result.itemTransactions[0].paymentTransactionId ?? null;
          }
          resolve({
            status: success ? 'SUCCESS' : 'FAILURE',
            paymentId: result?.paymentId ?? null,
            paymentTransactionId: ptid,
            raw: result,
          });
        },
      );
    });
  }

  /**
   * Best-effort refund of a previously captured payment transaction.
   * Failures are returned (not thrown) so the escrow state machine can proceed.
   */
  async refund(args: {
    paymentTransactionId: string;
    price: number;
    ip?: string;
  }): Promise<RefundResult> {
    if (!args.paymentTransactionId) {
      return { status: 'failure', refundId: null, error: 'no paymentTransactionId' };
    }
    if (this.mockMode || !this.client) {
      return { status: 'success', refundId: `mock_refund_${args.paymentTransactionId}` };
    }
    return new Promise<RefundResult>((resolve) => {
      this.client.refund.create(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: `refund_${args.paymentTransactionId}`,
          paymentTransactionId: args.paymentTransactionId,
          price: args.price.toFixed(2),
          currency: Iyzipay.CURRENCY.TRY,
          ip: args.ip || '85.34.78.112',
        },
        (err: any, result: any) => {
          if (err) {
            resolve({
              status: 'failure',
              refundId: null,
              error: err instanceof Error ? err.message : String(err),
            });
            return;
          }
          if (result && result.status === 'success') {
            resolve({ status: 'success', refundId: result.paymentId ?? null });
          } else {
            resolve({
              status: 'failure',
              refundId: null,
              error: result?.errorMessage || 'iyzipay refund failed',
            });
          }
        },
      );
    });
  }
}
