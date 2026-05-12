'use client';

import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { ConversationItemDto } from '@/lib/api';

interface ConversationListProps {
  conversations: ConversationItemDto[];
  selectedPeerId: string | null;
  onSelect: (peerId: string) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedPeerId,
  onSelect,
  isLoading = false,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Yükleniyor...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Konuşma yok</p>
          <p className="text-sm">Yeni bir konuşma başlayın</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {conversations.map((conv) => {
        const isSelected = selectedPeerId === conv.peerId;
        const timestamp = formatDistanceToNow(
          new Date(conv.lastMessage.createdAt),
          { addSuffix: true, locale: tr }
        );

        return (
          <button
            key={conv.peerId}
            onClick={() => onSelect(conv.peerId)}
            className={`w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition ${
              isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 relative">
                {conv.peerAvatarUrl ? (
                  <img
                    src={conv.peerAvatarUrl}
                    alt={conv.peerName || 'User'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                    {conv.peerName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {conv.peerOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {conv.peerName || 'Unknown User'}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {timestamp}
                  </span>
                </div>

                <p className="text-sm text-gray-600 truncate mt-1">
                  {conv.lastMessage.fromMe ? 'Siz: ' : ''}
                  {conv.lastMessage.text}
                </p>

                {conv.lastMessage.jobLeadId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Lead: {conv.lastMessage.jobLeadId.slice(0, 8)}
                  </p>
                )}
              </div>

              {conv.unreadCount > 0 && (
                <div className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
