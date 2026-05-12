'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { ChatMessageDto, ConversationItemDto } from '@/lib/api';
import { ChatMessage } from './ChatMessage';

interface ChatWindowProps {
  conversation: ConversationItemDto | null;
  messages: ChatMessageDto[];
  currentUserId: string;
  onSendMessage: (message: string, jobLeadId?: string) => Promise<void>;
  onMarkAsRead: (messageIds: string[]) => Promise<void>;
  isTyping: Map<string, boolean>;
  isLoading?: boolean;
  isSending?: boolean;
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onMarkAsRead,
  isTyping,
  isLoading = false,
  isSending = false,
}: ChatWindowProps) {
  const [messageText, setMessageText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  // Mark messages as read when they come into view
  useEffect(() => {
    if (!conversation || !messages.length) return;

    const unreadMessages = messages.filter(
      (m) => m.to === currentUserId && !m.readAt
    );

    const newUnreadIds = new Set(unreadIds);
    let hasNew = false;

    for (const msg of unreadMessages) {
      if (!newUnreadIds.has(msg.id)) {
        newUnreadIds.add(msg.id);
        hasNew = true;
      }
    }

    if (hasNew) {
      setUnreadIds(newUnreadIds);
      // Mark as read after a short delay
      const timer = setTimeout(() => {
        const idsToMark = Array.from(newUnreadIds);
        if (idsToMark.length > 0) {
          onMarkAsRead(idsToMark);
          newUnreadIds.clear();
          setUnreadIds(new Set());
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [messages, conversation, currentUserId, onMarkAsRead, unreadIds]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!messageText.trim() || !conversation) return;

      const text = messageText;
      setMessageText('');

      try {
        await onSendMessage(text, conversation.lastMessage.jobLeadId);
      } catch (error) {
        setMessageText(text); // Restore on error
        console.error('Failed to send message:', error);
      }
    },
    [messageText, conversation, onSendMessage]
  );

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Konuşma seçin</p>
          <p className="text-sm">Sol tarafdan bir konuşma seçerek başlayın</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Yükleniyor...
      </div>
    );
  }

  const peerIsTyping = isTyping.get(conversation.peerId);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {conversation.peerAvatarUrl ? (
              <img
                src={conversation.peerAvatarUrl}
                alt={conversation.peerName || 'User'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                {conversation.peerName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900">
                {conversation.peerName || 'Unknown User'}
              </h2>
              <p className="text-xs text-gray-500">
                {conversation.peerOnline
                  ? 'Çevrimiçi'
                  : conversation.peerLastSeenAt
                    ? `Son görülme: ${new Date(conversation.peerLastSeenAt).toLocaleTimeString('tr-TR')}`
                    : 'Çevrimdışı'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-center">
              <span className="block font-semibold mb-1">Konuşma başlayın</span>
              <span className="text-sm">İlk mesajı gönderin</span>
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwn={msg.from === currentUserId}
                senderName={
                  msg.from === currentUserId
                    ? undefined
                    : conversation.peerName || undefined
                }
                senderAvatar={
                  msg.from === currentUserId
                    ? undefined
                    : conversation.peerAvatarUrl || undefined
                }
              />
            ))}
            {peerIsTyping && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
                <div className="px-4 py-2 rounded-lg bg-gray-200">
                  <div className="flex gap-1 h-5">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="px-6 py-4 border-t border-gray-200 bg-white"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Mesaj yazın..."
            disabled={isSending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition"
          >
            {isSending ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      </form>
    </div>
  );
}
