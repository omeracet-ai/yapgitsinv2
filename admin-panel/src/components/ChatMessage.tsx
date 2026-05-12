'use client';

import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { ChatMessageDto } from '@/lib/api';

interface ChatMessageProps {
  message: ChatMessageDto;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
}

export function ChatMessage({
  message,
  isOwn,
  senderName,
  senderAvatar,
}: ChatMessageProps) {
  const timestamp = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
    locale: tr,
  });

  const getDeliveryIcon = () => {
    if (message.deliveryStatus === 'failed') return '✗';
    if (message.readAt) return '✓✓'; // read
    if (message.deliveryStatus === 'delivered') return '✓'; // delivered
    return ''; // sent
  };

  return (
    <div
      className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isOwn && senderAvatar && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 overflow-hidden">
          <img
            src={senderAvatar}
            alt={senderName || 'Sender'}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {isOwn && <div className="w-8 h-8 flex-shrink-0" />}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && senderName && (
          <span className="text-xs text-gray-500 font-semibold mb-1">
            {senderName}
          </span>
        )}

        <div
          className={`px-4 py-2 rounded-lg max-w-md break-words ${
            isOwn
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-900 rounded-bl-none'
          }`}
        >
          {message.jobLeadId && (
            <div className="text-xs opacity-75 mb-1 font-semibold">
              Lead: {message.jobLeadId.slice(0, 8)}
            </div>
          )}

          {message.attachmentUrl && (
            <div className="mb-2">
              {message.attachmentType === 'image' ? (
                <img
                  src={message.attachmentUrl}
                  alt="Attachment"
                  className="max-w-xs rounded"
                />
              ) : message.attachmentType === 'audio' ? (
                <audio
                  controls
                  className="max-w-xs"
                  src={message.attachmentUrl}
                />
              ) : (
                <a
                  href={message.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-sm"
                >
                  {message.attachmentName || 'Download file'}
                </a>
              )}
            </div>
          )}

          <p className="whitespace-pre-wrap">{message.message}</p>
        </div>

        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-gray-500">{timestamp}</span>
          {isOwn && (
            <span
              className={`text-xs ${
                message.readAt
                  ? 'text-blue-500'
                  : message.deliveryStatus === 'failed'
                    ? 'text-red-500'
                    : 'text-gray-400'
              }`}
            >
              {getDeliveryIcon()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
