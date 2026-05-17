/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ThreeDsInitDto } from './dto/threeds-init.dto';
import { mapIyzicoError } from './iyzico-error.map';

// iyzipay official Node SDK (CommonJS, no first-party types).
const Iyzipay = require('iyzipay');

export interface ThreeDsInitResult {
  /** iyzipay paymentId (use later in threedsPayment.create for finalize). */
  paymentId: string;
  /** Conversation id we generated (echo back from frontend if useful). */
  conversationId: string;
  /** Base64-encoded HTML/JS frontend renders in WebView/iframe to trigger ACS. */
  threeDSHtmlContent: string;
  /** True when running in mock mode (no live iyzipay call was made). */
  mock: boolean;
}

export interface ThreeDsFinalizeResult {
  status: 'success' | 'failure';
  paymentId: string | null;
  paymentTransactionId: string | null;
  fraudStatus: number | null;
  errorCode?: string;
  errorMessage?: string;
  raw?: any;
}

/**
 * Phase 248-FU (Voldi-fs) — iyzico 3D Secure live integration.
 *
 * Akış:
 *   1. Frontend → POST /iyzico/3ds/init (kart bilgileriyle)
 *   2. Bu servis → iyzipay.threedsInitialize.create → threeDSHtmlContent döner
 *   3. Frontend → WebView içinde HTML'i render eder, kullanıcı bankayı onaylar
 *   4. Banka → iyzipay → bizim callbackUrl'ye form-encoded POST
 *   5. POST /iyzico/3ds/callback → iyzipay.threedsPayment.create → finalize
 *
 * MOCK_IYZICO=1 ya da key'ler eksik → mock mode (e2e / lokal geliştirme).
 */
@Injectable()
export class IyzicoService {
  private readonly logger = new Logger(IyzicoService.name);
  private client: any = null;
  private readonly secretKey: string;
  readonly mockMode: boolean;

  constructor(private readonly config: ConfigService) {
    const apiKey =
      this.config.get<string>('IYZICO_API_KEY') ||
      process.env.IYZIPAY_API_KEY ||
      '';
    const secretKey =
      this.config.get<string>('IYZICO_SECRET_KEY') ||
      process.env.IYZIPAY_SECRET_KEY ||
      '';
    this.secretKey = secretKey;
    const uri =
      this.config.get<string>('IYZICO_BASE_URL') ||
      process.env.IYZIPAY_URI ||
      'https://sandbox-api.iyzipay.com';

    const placeholder =
      !apiKey ||
      !secretKey ||
      apiKey.startsWith('change_me') ||
      secretKey.startsWith('change_me');

    this.mockMode =
      this.config.get<string>('MOCK_IYZICO') === '1' ||
      process.env.MOCK_IYZICO === '1' ||
      placeholder;

    if (!this.mockMode) {
      try {
        this.client = new Iyzipay({ apiKey, secretKey, uri });
        this.logger.log(`iyzico 3DS initialised (uri=${uri})`);
      } catch (err) {
        this.logger.error(
          `iyzico init failed, falling back to mock: ${(err as Error).message}`,
        );
        (this as { mockMode: boolean }).mockMode = true;
      }
    } else {
      this.logger.warn(
        'iyzico 3DS running in MOCK mode (set real IYZICO_API_KEY/IYZICO_SECRET_KEY + MOCK_IYZICO=0 to go live)',
      );
    }

    if (this.mockMode && process.env.NODE_ENV === 'production') {
      throw new Error(
        'IyzicoService: refusing to start with MOCK_IYZICO=1 in production',
      );
    }
  }

  /**
   * Verify iyzipay 3DS callback signature.
   * iyzipay signs `conversationId + paymentId` with HMAC-SHA1(secretKey) → base64.
   * Mock mode bypasses (no live secret to verify against).
   */
  verifyCallbackSignature(body: {
    signature?: string;
    conversationId: string;
    paymentId: string;
  }): boolean {
    if (this.mockMode) return true;
    const sig = body.signature;
    if (!sig) return false;
    const payload = `${body.conversationId}${body.paymentId}`;
    const expected = crypto
      .createHmac('sha1', this.secretKey)
      .update(payload)
      .digest('base64');
    try {
      const a = Buffer.from(sig, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private callbackUrl(): string {
    const explicit = this.config.get<string>('IYZICO_CALLBACK_URL');
    if (explicit) return explicit;
    const base =
      this.config.get<string>('APP_BASE_URL') ||
      process.env.APP_BASE_URL ||
      'https://api.yapgitsin.tr';
    return `${base.replace(/\/$/, '')}/iyzico/3ds/callback`;
  }

  successRedirect(): string {
    return (
      this.config.get<string>('IYZICO_SUCCESS_URL') ||
      process.env.IYZICO_SUCCESS_URL ||
      'yapgitsin://payment-success'
    );
  }

  failRedirect(): string {
    return (
      this.config.get<string>('IYZICO_FAIL_URL') ||
      process.env.IYZICO_FAIL_URL ||
      'yapgitsin://payment-failure'
    );
  }

  /** Step 1 — 3DS Initialize: returns base64 HTML to render in WebView. */
  async threeDsInitialize(
    dto: ThreeDsInitDto,
    buyerIp: string,
  ): Promise<ThreeDsInitResult> {
    const conversationId = `${dto.basketId}_${Date.now()}`;

    if (this.mockMode || !this.client) {
      const mockHtml = Buffer.from(
        `<html><body><h1>Mock 3DS for ${dto.basketId}</h1><form id='f' method='POST' action='${this.callbackUrl()}'><input name='paymentId' value='mock_pid_${conversationId}'><input name='conversationId' value='${conversationId}'><input name='mdStatus' value='1'><input name='status' value='success'><input type='hidden' name='signature' value='mock'></form><script>document.getElementById('f').submit()</script></body></html>`,
      ).toString('base64');
      return {
        paymentId: `mock_pid_${conversationId}`,
        conversationId,
        threeDSHtmlContent: mockHtml,
        mock: true,
      };
    }

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      price: dto.price,
      paidPrice: dto.paidPrice,
      currency: Iyzipay.CURRENCY.TRY,
      installment: '1',
      basketId: dto.basketId,
      paymentChannel: Iyzipay.PAYMENT_CHANNEL.MOBILE,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: this.callbackUrl(),
      paymentCard: {
        cardHolderName: dto.cardHolderName,
        cardNumber: dto.cardNumber.replace(/\s+/g, ''),
        expireMonth: dto.expireMonth,
        expireYear: dto.expireYear,
        cvc: dto.cvc,
        registerCard: dto.registerCard ?? 0,
      },
      buyer: {
        id: dto.buyerId,
        name: dto.buyerName,
        surname: dto.buyerSurname,
        gsmNumber: dto.buyerGsmNumber,
        email: dto.buyerEmail,
        identityNumber: dto.identityNumber,
        lastLoginDate: this.nowSqlTs(),
        registrationDate: this.nowSqlTs(),
        registrationAddress: dto.buyerAddress,
        ip: buyerIp,
        city: dto.buyerCity,
        country: dto.buyerCountry,
        zipCode: dto.buyerZipCode || '34000',
      },
      shippingAddress: {
        contactName: `${dto.buyerName} ${dto.buyerSurname}`,
        city: dto.buyerCity,
        country: dto.buyerCountry,
        address: dto.buyerAddress,
        zipCode: dto.buyerZipCode || '34000',
      },
      billingAddress: {
        contactName: `${dto.buyerName} ${dto.buyerSurname}`,
        city: dto.buyerCity,
        country: dto.buyerCountry,
        address: dto.buyerAddress,
        zipCode: dto.buyerZipCode || '34000',
      },
      basketItems: [
        {
          id: dto.basketId,
          name: dto.itemName || 'Hizmet Ödemesi',
          category1: 'Hizmet',
          itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
          price: dto.price,
        },
      ],
    };

    return new Promise<ThreeDsInitResult>((resolve, reject) => {
      this.client.threedsInitialize.create(request, (err: any, result: any) => {
        if (err) {
          this.logger.error(
            `threedsInitialize error: ${err instanceof Error ? err.message : String(err)}`,
          );
          reject(
            new InternalServerErrorException(
              mapIyzicoError(undefined, 'iyzico 3DS initialize failed'),
            ),
          );
          return;
        }
        if (!result || result.status !== 'success') {
          const msg = mapIyzicoError(result?.errorCode, result?.errorMessage);
          this.logger.warn(
            `threedsInitialize failure code=${result?.errorCode} msg=${result?.errorMessage}`,
          );
          reject(new BadRequestException({ message: msg, errorCode: result?.errorCode }));
          return;
        }
        if (!result.threeDSHtmlContent) {
          reject(
            new InternalServerErrorException(
              'iyzico returned no threeDSHtmlContent',
            ),
          );
          return;
        }
        resolve({
          paymentId: result.paymentId ?? '',
          conversationId,
          threeDSHtmlContent: result.threeDSHtmlContent,
          mock: false,
        });
      });
    });
  }

  /** Step 2 — finalize 3DS payment after bank ACS callback. */
  async threeDsFinalize(
    paymentId: string,
    conversationId: string,
  ): Promise<ThreeDsFinalizeResult> {
    if (this.mockMode || !this.client) {
      const ok = !/fail/i.test(paymentId);
      return {
        status: ok ? 'success' : 'failure',
        paymentId: ok ? paymentId : null,
        paymentTransactionId: ok ? `mock_ptid_${paymentId}` : null,
        fraudStatus: ok ? 1 : 0,
      };
    }
    return new Promise<ThreeDsFinalizeResult>((resolve) => {
      this.client.threedsPayment.create(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId,
          paymentId,
        },
        (err: any, result: any) => {
          if (err) {
            this.logger.error(
              `threedsPayment error: ${err instanceof Error ? err.message : String(err)}`,
            );
            resolve({
              status: 'failure',
              paymentId: null,
              paymentTransactionId: null,
              fraudStatus: null,
              errorMessage: err instanceof Error ? err.message : String(err),
            });
            return;
          }
          if (!result || result.status !== 'success') {
            resolve({
              status: 'failure',
              paymentId: result?.paymentId ?? null,
              paymentTransactionId: null,
              fraudStatus: result?.fraudStatus ?? null,
              errorCode: result?.errorCode,
              errorMessage: mapIyzicoError(
                result?.errorCode,
                result?.errorMessage,
              ),
              raw: result,
            });
            return;
          }
          let ptid: string | null = null;
          if (
            Array.isArray(result.itemTransactions) &&
            result.itemTransactions.length > 0
          ) {
            ptid = result.itemTransactions[0].paymentTransactionId ?? null;
          }
          resolve({
            status: 'success',
            paymentId: result.paymentId ?? null,
            paymentTransactionId: ptid,
            fraudStatus: result.fraudStatus ?? null,
            raw: result,
          });
        },
      );
    });
  }

  private nowSqlTs(): string {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
}
