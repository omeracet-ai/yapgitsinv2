import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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

interface PaymentHistoryProps {
  viewType?: 'customer' | 'worker'; // customer: payments made, worker: payments received
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ viewType = 'customer' }) => {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!session) return;

    const fetchPayments = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = new URL('/api/payments/history', window.location.origin);
        url.searchParams.set('skip', skip.toString());
        url.searchParams.set('take', PAGE_SIZE.toString());
        if (statusFilter) {
          url.searchParams.set('status', statusFilter);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${session?.user?.accessToken || ''}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch payment history');
        }

        const data = await response.json();
        setPayments(data.payments || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [session, skip, statusFilter]);

  const formatAmount = (minor: number) => {
    const major = Math.floor(minor / 100);
    const cents = minor % 100;
    return `${major}.${cents.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">
          {viewType === 'customer' ? 'Payment History' : 'Earnings & Payments Received'}
        </h2>

        {/* Filter Section */}
        <div className="mb-6 flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setSkip(0);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Payments Table */}
        {!loading && payments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Amount</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Description</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Method</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {formatAmount(payment.amountMinor)} {payment.currency}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {payment.description || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {payment.method || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 text-xs font-mono">
                      {payment.externalTransactionId?.substring(0, 12) || 'Pending'}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!loading && payments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No payments found</p>
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {skip + 1} to {Math.min(skip + PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
                disabled={skip === 0}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setSkip(skip + PAGE_SIZE)}
                disabled={skip + PAGE_SIZE >= total}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
