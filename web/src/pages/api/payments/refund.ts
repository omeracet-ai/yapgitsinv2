import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

interface RefundBody {
  paymentId: string;
  amountMinor?: number;
  reason?: string;
}

interface RefundResponse {
  paymentId: string;
  refundId: string | null;
  amountRefunded: number;
  status: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RefundResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body as RefundBody;

    if (!body.paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' });
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/payments/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(session as any).accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Refund processing failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Refund processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
