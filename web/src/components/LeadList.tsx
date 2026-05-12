'use client';

import { useState, useEffect } from 'react';

interface Lead {
  id: string;
  category: string;
  city: string;
  description?: string;
  budgetMin?: number;
  budgetMax?: number;
  requesterName: string;
  status: 'open' | 'in_progress' | 'closed' | 'expired';
  createdAt: string;
  responses?: Array<{
    id: string;
    workerId: string;
    status: string;
    respondedAt?: string;
  }>;
}

interface LeadListProps {
  userId?: string;
  onlyMine?: boolean;
}

export default function LeadList({ userId, onlyMine = false }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!onlyMine || !userId) return;

    const fetchLeads = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/job-leads?page=${page}&limit=20`, {
          headers: { 'Content-Type': 'application/json' },
          // Add auth header if userId is provided (would need token)
        });

        if (response.ok) {
          const data = await response.json();
          setLeads(data.data || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error('Failed to load leads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [userId, onlyMine, page]);

  if (!onlyMine || !userId) {
    return <div className="text-gray-500">İş isteklerini görmek için giriş yapmanız gerekir.</div>;
  }

  if (loading) {
    return <div className="text-gray-500">Yükleniyor...</div>;
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-lg p-8 text-center">
        <p className="text-gray-500">Henüz iş isteği göndermediniz.</p>
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    open: { label: 'Açık', color: 'bg-blue-100 text-blue-800' },
    in_progress: { label: 'İşlemde', color: 'bg-yellow-100 text-yellow-800' },
    closed: { label: 'Kapalı', color: 'bg-green-100 text-green-800' },
    expired: { label: 'Süresi Doldu', color: 'bg-gray-100 text-gray-800' },
  };

  return (
    <div>
      <div className="grid gap-4">
        {leads.map((lead) => {
          const statusInfo = statusLabels[lead.status] || statusLabels.open;
          const responseCount = lead.responses?.length || 0;

          return (
            <div key={lead.id} className="bg-white border border-[var(--border)] rounded-lg p-4 md:p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[var(--secondary)] text-lg">{lead.category}</h3>
                  <p className="text-sm text-gray-500">
                    {lead.city} • {new Date(lead.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>

              {lead.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{lead.description}</p>
              )}

              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                {lead.budgetMin || lead.budgetMax ? (
                  <div>
                    <span className="text-gray-500">Bütçe: </span>
                    <span className="font-medium">
                      {lead.budgetMin || 0} - {lead.budgetMax || '∞'} TL
                    </span>
                  </div>
                ) : null}
                {responseCount > 0 && (
                  <div>
                    <span className="text-gray-500">Yanıtlar: </span>
                    <span className="font-medium text-[var(--primary)]">{responseCount}</span>
                  </div>
                )}
              </div>

              <button className="w-full md:w-auto px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:brightness-110 transition">
                Detayları Gör
              </button>
            </div>
          );
        })}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <button
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Önceki
            </button>
          )}
          <span className="px-4 py-2 text-sm text-gray-600">
            Sayfa {page} / {Math.ceil(total / 20)}
          </span>
          {page < Math.ceil(total / 20) && (
            <button
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Sonraki
            </button>
          )}
        </div>
      )}
    </div>
  );
}
