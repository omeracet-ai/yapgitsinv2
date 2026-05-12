import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface PaymentFormProps {
  workerId: string;
  amountMinor: number; // Amount in minor units (cents)
  currency?: string;
  bookingId?: string;
  onSuccess?: (paymentId: string, transactionId: string) => void;
  onError?: (error: string) => void;
}

interface PaymentState {
  loading: boolean;
  error: string | null;
  paymentIntentId?: string;
  step: 'amount' | 'processing' | 'success' | 'error';
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  workerId,
  amountMinor,
  currency = 'TRY',
  bookingId,
  onSuccess,
  onError,
}) => {
  const { data: session } = useSession();
  const [state, setState] = useState<PaymentState>({
    loading: false,
    error: null,
    step: 'amount',
  });

  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvc: '',
  });

  // Create payment intent
  const createPaymentIntent = useCallback(async () => {
    if (!session) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.user?.accessToken || ''}`,
        },
        body: JSON.stringify({
          workerId,
          amountMinor,
          currency,
          bookingId,
          description: `Payment for service: ${workerId}`,
          receiptEmail: session?.user?.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        paymentIntentId: data.paymentIntentId,
        loading: false,
        step: 'processing',
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment creation failed';
      setState(prev => ({
        ...prev,
        error: errorMsg,
        loading: false,
        step: 'error',
      }));
      onError?.(errorMsg);
    }
  }, [session, workerId, amountMinor, currency, bookingId]);

  // Confirm payment
  const confirmPayment = useCallback(async () => {
    if (!state.paymentIntentId || !session) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.user?.accessToken || ''}`,
        },
        body: JSON.stringify({
          paymentIntentId: state.paymentIntentId,
          token: `card_${cardDetails.cardNumber.slice(-4)}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment confirmation failed');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        loading: false,
        step: 'success',
      }));
      onSuccess?.(data.paymentId, data.externalTransactionId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment confirmation failed';
      setState(prev => ({
        ...prev,
        error: errorMsg,
        loading: false,
        step: 'error',
      }));
      onError?.(errorMsg);
    }
  }, [state.paymentIntentId, session, cardDetails, onSuccess, onError]);

  const handleCardChange = (field: keyof typeof cardDetails, value: string) => {
    setCardDetails(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatAmount = (minor: number) => {
    const major = Math.floor(minor / 100);
    const cents = minor % 100;
    return `${major}.${cents.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Payment</h2>

      {/* Amount Display */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-600">Amount to pay</p>
        <p className="text-3xl font-bold text-blue-600">
          {formatAmount(amountMinor)} {currency}
        </p>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Amount Confirmation Step */}
      {state.step === 'amount' && (
        <button
          onClick={createPaymentIntent}
          disabled={state.loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
        >
          {state.loading ? 'Processing...' : 'Continue to Payment'}
        </button>
      )}

      {/* Card Details Step */}
      {state.step === 'processing' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={cardDetails.cardholderName}
              onChange={e => handleCardChange('cardholderName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Number
            </label>
            <input
              type="text"
              placeholder="4242 4242 4242 4242"
              value={cardDetails.cardNumber}
              onChange={e => handleCardChange('cardNumber', e.target.value.replace(/\s/g, ''))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              maxLength={16}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                value={cardDetails.expiryDate}
                onChange={e => handleCardChange('expiryDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CVC
              </label>
              <input
                type="text"
                placeholder="123"
                value={cardDetails.cvc}
                onChange={e => handleCardChange('cvc', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                maxLength={3}
              />
            </div>
          </div>

          <button
            onClick={confirmPayment}
            disabled={state.loading || !cardDetails.cardNumber || !cardDetails.cvc}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {state.loading ? 'Processing...' : `Pay ${formatAmount(amountMinor)} ${currency}`}
          </button>
        </div>
      )}

      {/* Success Step */}
      {state.step === 'success' && (
        <div className="text-center">
          <div className="mb-4 text-5xl">✓</div>
          <p className="text-lg font-semibold text-green-600 mb-2">Payment Successful!</p>
          <p className="text-sm text-gray-600 mb-6">
            Your payment of {formatAmount(amountMinor)} {currency} has been processed.
          </p>
          <button
            onClick={() => setState(prev => ({ ...prev, step: 'amount' }))}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Make Another Payment
          </button>
        </div>
      )}

      {/* Loading State */}
      {state.loading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};
