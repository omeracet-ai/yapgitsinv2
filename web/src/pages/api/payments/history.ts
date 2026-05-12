import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

interface PaymentRecord {
  id: string;
  customerId: string;
  workerId: string;
  bookingId: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  method: string;
  externalTransactionId: string | null;
  description: string | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface HistoryResponse {
  payments: PaymentRecord[];
  total: number;
  skip: number;
  take: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HistoryResponse | { error: string }>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { skip = 0, take = 20, status, startDate, endDate } = req.query;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    const url = new URL(`${backendUrl}/payments/history`);
    url.searchParams.set('skip', (skip as string) || '0');
    url.searchParams.set('take', (take as string) || '20');
    if (status) url.searchParams.set('status', status as string);
    if (startDate) url.searchParams.set('startDate', startDate as string);
    if (endDate) url.searchParams.set('endDate', endDate as string);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(session as any).accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Failed to fetch payment history' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Payment history fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
