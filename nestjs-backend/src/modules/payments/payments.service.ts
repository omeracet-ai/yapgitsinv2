/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */
import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/booking.entity';
import { Payment, PaymentStatus, PaymentMethod } from './payment.entity';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { v4 as uuidv4 } from 'uuid';

const Iyzipay = require('iyzipay');

@Injectable()
export class PaymentsService {
  private iyzipay: any;
  private useStripe: boolean;
  private stripeApiKey: string | null;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private notificationsService: NotificationsService,
  ) {
    // Initialize Iyzipay for legacy checkout form
    const apiKey = process.env.IYZIPAY_API_KEY;
    const secretKey = process.env.IYZIPAY_SECRET_KEY;
    const uri = process.env.IYZIPAY_URI;

    if (apiKey && secretKey && uri) {
      this.iyzipay = new Iyzipay({ apiKey, secretKey, uri });
    }

    // Check for Stripe configuration
    this.stripeApiKey = process.env.STRIPE_API_KEY || null;
    this.useStripe = !!this.stripeApiKey;
  }

  // Payment Intent Creation
  async createPaymentIntent(customerId: string, dto: CreatePaymentIntentDto) {
    const { workerId, amountMinor, bookingId, description, currency = 'TRY', method = PaymentMethod.CARD, receiptEmail, idempotencyKey } = dto;

    // Validate amount
    if (amountMinor <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Check if worker exists
    // (In production, you'd verify the worker exists)

    // Create payment record
    const payment = this.paymentRepository.create({
      customerId,
      workerId,
      bookingId: bookingId || null,
      amountMinor,
      currency,
      status: PaymentStatus.PENDING,
      method,
      description: description || `Payment to ${workerId}`,
      receiptEmail: receiptEmail || null,
      idempotencyKey: idempotencyKey || uuidv4(),
      paymentIntentId: uuidv4(),
    });

    await this.paymentRepository.save(payment);

    return {
      paymentId: payment.id,
      paymentIntentId: payment.paymentIntentId,
      status: PaymentStatus.PENDING,
      amountMinor,
      currency,
      method,
    };
  }

  // Confirm Payment (Process the payment)
  async confirmPayment(customerId: string, dto: ConfirmPaymentDto) {
    const { paymentIntentId, token, providerTransactionId } = dto;

    // Find the payment
    const payment = await this.paymentRepository.findOne({
      where: { paymentIntentId, customerId },
    });

    if (!payment) {
      throw new NotFoundException('Payment intent not found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Payment already ${payment.status}`);
    }

    // Mark as processing
    payment.status = PaymentStatus.PROCESSING;
    await this.paymentRepository.save(payment);

    try {
      // Process payment based on method
      if (payment.method === PaymentMethod.MOCK) {
        // Mock payment success
        payment.status = PaymentStatus.COMPLETED;
        payment.externalTransactionId = `mock_${uuidv4()}`;
        payment.completedAt = new Date();
      } else if (payment.method === PaymentMethod.IYZIPAY && providerTransactionId) {
        // Validate with Iyzipay
        // (Placeholder - integrate with actual Iyzipay verification)
        payment.status = PaymentStatus.COMPLETED;
        payment.externalTransactionId = providerTransactionId;
        payment.completedAt = new Date();
      } else if (payment.method === PaymentMethod.CARD) {
        // Process card payment via Stripe or mock
        if (this.useStripe && this.stripeApiKey) {
          // Stripe integration (placeholder)
          payment.status = PaymentStatus.COMPLETED;
          payment.externalTransactionId = `stripe_${uuidv4()}`;
          payment.completedAt = new Date();
        } else {
          // Fall back to mock
          payment.status = PaymentStatus.COMPLETED;
          payment.externalTransactionId = `mock_${uuidv4()}`;
          payment.completedAt = new Date();
        }
      }

      await this.paymentRepository.save(payment);

      // Phase 164 — send push notification to worker on payment received
      if (payment.status === PaymentStatus.COMPLETED && payment.workerId) {
        void (async () => {
          try {
            const amount = (payment.amountMinor / 100).toFixed(2);
            await this.notificationsService.send({
              userId: payment.workerId,
              type: NotificationType.SYSTEM,
              title: 'Ödeme Alındı',
              body: `${amount} ${payment.currency} ödemeniz tamamlandı.`,
              refId: payment.id,
              relatedType: 'user',
              relatedId: payment.customerId,
            });
          } catch (err) {
            this.logger.warn(
              `Failed to send payment notification to worker ${payment.workerId}: ${(err as Error).message}`,
            );
          }
        })();
      }

      return {
        paymentId: payment.id,
        status: payment.status,
        externalTransactionId: payment.externalTransactionId,
        completedAt: payment.completedAt,
      };
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      await this.paymentRepository.save(payment);
      throw new InternalServerErrorException('Payment processing failed');
    }
  }

  // Get Payment History
  async getPaymentHistory(userId: string, queryDto: PaymentHistoryQueryDto, isWorker: boolean = false) {
    const { skip = 0, take = 20, status, startDate, endDate } = queryDto;

    const query = this.paymentRepository.createQueryBuilder('payment');

    if (isWorker) {
      // Worker view: payments received
      query.where('payment.workerId = :userId', { userId });
    } else {
      // Customer view: payments made
      query.where('payment.customerId = :userId', { userId });
    }

    if (status) {
      query.andWhere('payment.status = :status', { status });
    }

    if (startDate) {
      query.andWhere('payment.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      query.andWhere('payment.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    query.orderBy('payment.createdAt', 'DESC').skip(skip).take(take);

    const [payments, total] = await query.getManyAndCount();

    return {
      payments: payments.map(p => ({
        id: p.id,
        customerId: p.customerId,
        workerId: p.workerId,
        bookingId: p.bookingId,
        amountMinor: p.amountMinor,
        currency: p.currency,
        status: p.status,
        method: p.method,
        externalTransactionId: p.externalTransactionId,
        description: p.description,
        createdAt: p.createdAt,
        completedAt: p.completedAt,
        errorMessage: p.errorMessage,
      })),
      total,
      skip,
      take,
    };
  }

  // Get Worker Earnings Summary
  async getWorkerEarnings(workerId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // From completed payments
    const completedPayments = await this.paymentRepository.find({
      where: {
        workerId,
        status: PaymentStatus.COMPLETED,
      },
      order: { completedAt: 'DESC' },
    });

    const total = completedPayments.reduce((sum, p) => sum + p.amountMinor, 0);

    const monthly = completedPayments
      .filter(p => p.completedAt && new Date(p.completedAt) >= thirtyDaysAgo)
      .reduce((sum, p) => sum + p.amountMinor, 0);

    const weekly = completedPayments
      .filter(p => p.completedAt && new Date(p.completedAt) >= sevenDaysAgo)
      .reduce((sum, p) => sum + p.amountMinor, 0);

    // Also include old earnings from bookings (legacy)
    const completedBookings = await this.bookingRepository.find({
      where: {
        workerId,
        status: BookingStatus.COMPLETED,
      },
      order: { updatedAt: 'DESC' },
    });

    const bookingTotal = completedBookings.reduce((sum, b) => sum + (b.agreedPriceMinor || 0), 0);
    const bookingMonthly = completedBookings
      .filter(b => new Date(b.updatedAt) >= thirtyDaysAgo)
      .reduce((sum, b) => sum + (b.agreedPriceMinor || 0), 0);
    const bookingWeekly = completedBookings
      .filter(b => new Date(b.updatedAt) >= sevenDaysAgo)
      .reduce((sum, b) => sum + (b.agreedPriceMinor || 0), 0);

    return {
      totalEarnings: total + bookingTotal,
      monthlyEarnings: monthly + bookingMonthly,
      weeklyEarnings: weekly + bookingWeekly,
      completedPaymentCount: completedPayments.length,
      completedBookingCount: completedBookings.length,
      lastTransactions: [
        ...completedPayments.slice(0, 5).map(p => ({
          id: p.id,
          amount: p.amountMinor,
          date: p.completedAt,
          type: 'payment',
          description: p.description,
        })),
        ...completedBookings.slice(0, 5).map(b => ({
          id: b.id,
          amount: b.agreedPriceMinor,
          date: b.updatedAt,
          type: 'booking',
          description: b.category,
        })),
      ].sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0)),
    };
  }

  // Refund Payment
  async refundPayment(customerId: string, dto: RefundPaymentDto) {
    const { paymentId, amountMinor, reason } = dto;

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, customerId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const refundAmount = amountMinor || payment.amountMinor;

    if (refundAmount > payment.amountMinor) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    try {
      // Process refund based on payment method
      payment.refundId = `refund_${uuidv4()}`;
      payment.refundedAmountMinor = refundAmount;

      if (refundAmount === payment.amountMinor) {
        payment.status = PaymentStatus.REFUNDED;
      } else {
        // Partial refund - keep status as completed but mark with refund info
        payment.status = PaymentStatus.COMPLETED;
      }

      await this.paymentRepository.save(payment);

      return {
        paymentId: payment.id,
        refundId: payment.refundId,
        amountRefunded: refundAmount,
        status: payment.status,
      };
    } catch (error) {
      throw new InternalServerErrorException('Refund processing failed');
    }
  }

  // Legacy Iyzipay Checkout Form
  async createCheckoutForm(data: {
    price: string;
    paidPrice: string;
    basketId: string;
    user: any;
  }) {
    if (!this.iyzipay) {
      throw new InternalServerErrorException('Iyzipay not configured');
    }

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: '123456789',
      price: data.price,
      paidPrice: data.paidPrice,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: data.basketId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: 'http://localhost:3000/payments/callback',
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id: data.user.id || 'BY789',
        name: data.user.name || 'John',
        surname: data.user.surname || 'Doe',
        gsmNumber: '+905350000000',
        email: data.user.email || 'email@email.com',
        identityNumber: '74300864791',
        lastLoginDate: '2015-10-05 12:43:35',
        registrationDate: '2013-04-21 15:12:09',
        registrationAddress: 'Nisantasi',
        ip: '85.34.78.112',
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34732',
      },
      shippingAddress: {
        contactName: 'Jane Doe',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Nisantasi',
        zipCode: '34732',
      },
      billingAddress: {
        contactName: 'Jane Doe',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Nisantasi',
        zipCode: '34732',
      },
      basketItems: [
        {
          id: 'BI101',
          name: 'Hizmet Ödemesi',
          category1: 'Hizmet',
          itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
          price: data.price,
        },
      ],
    };

    return new Promise((resolve, reject) => {
      this.iyzipay.checkoutFormInitialize.create(request, (err, result) => {
        if (err) reject(err instanceof Error ? err : new Error(String(err)));
        else resolve(result);
      });
    });
  }

  async retrieveCheckoutResult(token: string) {
    if (!this.iyzipay) {
      throw new InternalServerErrorException('Iyzipay not configured');
    }

    return new Promise((resolve, reject) => {
      this.iyzipay.checkoutForm.retrieve(
        { locale: 'tr', token },
        (err, result) => {
          if (err) reject(err instanceof Error ? err : new Error(String(err)));
          else resolve(result);
        },
      );
    });
  }

  // Webhook handler for payment provider events
  async handlePaymentWebhook(event: any) {
    const { type, data } = event;

    if (type === 'payment.completed') {
      const { paymentIntentId, externalTransactionId } = data;
      const payment = await this.paymentRepository.findOne({
        where: { paymentIntentId },
      });

      if (payment) {
        payment.status = PaymentStatus.COMPLETED;
        payment.externalTransactionId = externalTransactionId;
        payment.completedAt = new Date();
        await this.paymentRepository.save(payment);
      }
    } else if (type === 'payment.failed') {
      const { paymentIntentId, error } = data;
      const payment = await this.paymentRepository.findOne({
        where: { paymentIntentId },
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        payment.errorMessage = error;
        await this.paymentRepository.save(payment);
      }
    }
  }
}
