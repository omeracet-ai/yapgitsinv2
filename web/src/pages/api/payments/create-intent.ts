import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

interface CreateIntentBody {
  workerId: string;
  amountMinor: number;
  currency?: string;
  bookingId?: string;
  description?: string;
  receiptEmail?: string;
  idempotencyKey?: string;
}

interface CreateIntentResponse {
  paymentId: string;
  paymentIntentId: string;
  status: string;
  amountMinor: number;
  currency: string;
  method: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateIntentResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body as CreateIntentBody;

    // Validate required fields
    if (!body.workerId || !body.amountMinor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Call backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(session as any).accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Failed to create payment intent' });
    }

    const data = await response.json();
    return res.status(201).json(data);
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
