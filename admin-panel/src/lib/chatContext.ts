import { createContext, useContext } from 'react';
import type { ChatMessageDto, ConversationItemDto } from './api';

export interface ChatContextType {
  // State
  conversations: ConversationItemDto[];
  selectedConversationId: string | null;
  messages: ChatMessageDto[];
  unreadCount: number;
  unreadByPeer: Map<string, number>;
  isTyping: Map<string, boolean>;
  onlineUsers: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  selectConversation: (peerId: string) => Promise<void>;
  sendMessage: (to: string, message: string, jobLeadId?: string) => Promise<void>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  setIsTyping: (roomId: string, isTyping: boolean) => void;
  clearError: () => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(
  undefined
);

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
