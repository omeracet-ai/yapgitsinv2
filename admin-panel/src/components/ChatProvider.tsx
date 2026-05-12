'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { api, type ChatMessageDto, type ConversationItemDto } from '@/lib/api';
import { ChatContext } from '@/lib/chatContext';
import { useWebSocket } from '@/lib/useWebSocket';

interface ChatProviderProps {
  userId: string;
  children: ReactNode;
}

export function ChatProvider({ userId, children }: ChatProviderProps) {
  const [conversations, setConversations] = useState<ConversationItemDto[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByPeer, setUnreadByPeer] = useState<Map<string, number>>(
    new Map()
  );
  const [isTyping, setIsTypingMap] = useState<Map<string, boolean>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Load conversations on mount
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const convs = await api.getConversations();
      setConversations(convs);
      const total = convs.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadCount(total);
    } catch (e) {
      console.error('Failed to load conversations:', e);
      setError('Konuşmalar yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // WebSocket handlers
  const handleMessage = useCallback((msg: ChatMessageDto) => {
    setMessages((prev) => {
      // Check if message already exists
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });

    // Update unread count if message is for current user
    if (msg.to === userId && !msg.readAt) {
      setUnreadCount((prev) => prev + 1);
    }

    // Update conversations list
    loadConversations();
  }, [userId, loadConversations]);

  const handleRead = useCallback((messageIds: string[]) => {
    setMessages((prev) =>
      prev.map((m) =>
        messageIds.includes(m.id) ? { ...m, readAt: new Date().toISOString() } : m
      )
    );
  }, []);

  const handleTyping = useCallback(
    (data: { userId: string; isTyping: boolean }) => {
      setIsTypingMap((prev) => new Map(prev).set(data.userId, data.isTyping));
    },
    []
  );

  const handlePresence = useCallback(
    (data: { userId: string; isOnline: boolean; lastSeenAt?: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.isOnline) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    },
    []
  );

  const handleError = useCallback((err: string) => {
    console.error('WebSocket error:', err);
    setError(err);
  }, []);

  const {
    isConnected,
    sendMessage: wsaSendMessage,
    markRead,
    setTyping,
    joinRoom,
  } = useWebSocket({
    userId,
    onMessage: handleMessage,
    onRead: handleRead,
    onTyping: handleTyping,
    onPresence: handlePresence,
    onError: handleError,
  });

  const selectConversation = useCallback(
    async (peerId: string) => {
      setSelectedConversationId(peerId);
      try {
        setIsLoading(true);
        const hist = await api.getMessageHistory(peerId);
        setMessages(hist);
        joinRoom(`${userId}-${peerId}`);
      } catch (e) {
        console.error('Failed to load message history:', e);
        setError('Mesajlar yüklenemedi');
      } finally {
        setIsLoading(false);
      }
    },
    [userId, joinRoom]
  );

  const sendMessage = useCallback(
    async (to: string, message: string, jobLeadId?: string) => {
      if (!isConnected) {
        setError('WebSocket bağlantısı kopuk');
        return;
      }

      try {
        setIsSending(true);
        wsaSendMessage(to, message, jobLeadId);
        // Also call REST API for persistence
        await api.sendMessage(to, message, jobLeadId);
      } catch (e) {
        console.error('Failed to send message:', e);
        setError('Mesaj gönderilemedi');
      } finally {
        setIsSending(false);
      }
    },
    [isConnected, wsaSendMessage]
  );

  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      try {
        await api.markMessagesAsRead(messageIds);
        const roomId = selectedConversationId
          ? `${userId}-${selectedConversationId}`
          : '';
        if (roomId) {
          markRead(messageIds, roomId);
        }
        setUnreadCount((prev) =>
          Math.max(0, prev - messageIds.length)
        );
      } catch (e) {
        console.error('Failed to mark as read:', e);
      }
    },
    [userId, selectedConversationId, markRead]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await api.deleteMessage(messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (e) {
        console.error('Failed to delete message:', e);
        setError('Mesaj silinemedi');
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        selectedConversationId,
        messages,
        unreadCount,
        unreadByPeer,
        isTyping,
        onlineUsers,
        isLoading,
        error,
        selectConversation,
        sendMessage,
        markAsRead,
        deleteMessage,
        loadConversations,
        setIsTyping,
        clearError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
