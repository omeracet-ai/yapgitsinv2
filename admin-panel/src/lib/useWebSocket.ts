import { useEffect, useRef, useCallback, useState } from 'react';
import type { ChatMessageDto } from './api';

interface WebSocketMessage {
  type:
    | 'receiveMessage'
    | 'messagesRead'
    | 'userTyping'
    | 'presence'
    | 'error';
  data: unknown;
}

export interface UseWebSocketOptions {
  userId: string;
  onMessage?: (msg: ChatMessageDto) => void;
  onRead?: (messageIds: string[]) => void;
  onTyping?: (data: { userId: string; isTyping: boolean }) => void;
  onPresence?: (data: {
    userId: string;
    isOnline: boolean;
    lastSeenAt?: string;
  }) => void;
  onError?: (error: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    userId,
    onMessage,
    onRead,
    onTyping,
    onPresence,
    onError,
  } = options;

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!userId) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_API_URL
      ? new URL(process.env.NEXT_PUBLIC_API_URL).host
      : window.location.host;

    const wsUrl = `${protocol}//${host}/chat`;

    try {
      ws.current = new WebSocket(wsUrl, [], {
        headers: { userId },
      } as any);

      ws.current.onopen = () => {
        setIsConnected(true);
        const token = localStorage.getItem('admin_token');
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(
            JSON.stringify({
              type: 'auth',
              userId,
              token,
            })
          );
        }
      };

      ws.current.onmessage = (event: MessageEvent) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);

          switch (msg.type) {
            case 'receiveMessage':
              onMessage?.(msg.data as ChatMessageDto);
              break;
            case 'messagesRead':
              onRead?.((msg.data as { messageIds: string[] }).messageIds);
              break;
            case 'userTyping':
              onTyping?.(msg.data as { userId: string; isTyping: boolean });
              break;
            case 'presence':
              onPresence?.(
                msg.data as {
                  userId: string;
                  isOnline: boolean;
                  lastSeenAt?: string;
                }
              );
              break;
            case 'error':
              onError?.(msg.data as string);
              break;
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      ws.current.onerror = (event: Event) => {
        console.error('WebSocket error:', event);
        onError?.('WebSocket connection error');
        setIsConnected(false);
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      onError?.('Failed to connect to WebSocket');
    }
  }, [userId, onMessage, onRead, onTyping, onPresence, onError]);

  const send = useCallback(
    (type: string, data: unknown) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type, data }));
      }
    },
    []
  );

  const sendMessage = useCallback(
    (to: string, message: string, jobLeadId?: string) => {
      send('sendMessage', { from: userId, to, message, jobLeadId });
    },
    [userId, send]
  );

  const markRead = useCallback(
    (messageIds: string[], roomId: string) => {
      send('markRead', { messageIds, roomId });
    },
    [send]
  );

  const setTyping = useCallback(
    (roomId: string, isTyping: boolean) => {
      send('typing', { roomId, userId, isTyping });
    },
    [userId, send]
  );

  const joinRoom = useCallback(
    (roomId: string) => {
      send('joinRoom', roomId);
    },
    [send]
  );

  const getHistory = useCallback(
    (conversationUserId: string, peerId: string) => {
      send('getHistory', { userId: conversationUserId, peerId });
    },
    [send]
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    markRead,
    setTyping,
    joinRoom,
    getHistory,
    disconnect,
  };
}
