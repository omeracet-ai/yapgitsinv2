import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

interface ConfirmPaymentBody {
  paymentIntentId: string;
  token?: string;
  providerTransactionId?: string;
}

interface ConfirmPaymentResponse {
  paymentId: string;
  status: string;
  externalTransactionId: string | null;
  completedAt: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConfirmPaymentResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body as ConfirmPaymentBody;

    if (!body.paymentIntentId) {
      return res.status(400).json({ error: 'Missing paymentIntentId' });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/payments/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(session as any).accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Payment confirmation failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
