/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */
import { Injectable } from '@nestjs/common';
const Iyzipay = require('iyzipay');

@Injectable()
export class PaymentsService {
  private iyzipay: any;

  constructor() {
    const apiKey = process.env.IYZIPAY_API_KEY;
    const secretKey = process.env.IYZIPAY_SECRET_KEY;
    const uri = process.env.IYZIPAY_URI;
    if (!apiKey || !secretKey || !uri) {
      throw new Error('IYZIPAY_API_KEY, IYZIPAY_SECRET_KEY ve IYZIPAY_URI ortam değişkenleri tanımlanmamış');
    }
    this.iyzipay = new Iyzipay({ apiKey, secretKey, uri });
  }

  async createCheckoutForm(data: {
    price: string;
    paidPrice: string;
    basketId: string;
    user: any;
  }) {
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
}
