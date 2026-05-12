'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatProvider } from '@/components/ChatProvider';
import { ConversationList } from '@/components/ConversationList';
import { ChatWindow } from '@/components/ChatWindow';
import { useChat } from '@/lib/chatContext';

function ChatContent() {
  const router = useRouter();
  const {
    conversations,
    selectedConversationId,
    messages,
    unreadCount,
    isTyping,
    isLoading,
    error,
    selectConversation,
    sendMessage,
    markAsRead,
    clearError,
  } = useChat();

  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    // Get current user from localStorage
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Try to get user ID from session storage or localStorage
    const userId = localStorage.getItem('admin_user_id');
    if (userId) {
      setCurrentUserId(userId);
    }
  }, [router]);

  const selectedConversation = conversations.find(
    (c) => c.peerId === selectedConversationId
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Mesajlar</h1>
        {unreadCount > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            {unreadCount} okunmamış mesaj
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex justify-between items-center">
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={clearError}
            className="text-red-700 hover:text-red-900 font-semibold text-sm"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation list */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-hidden flex flex-col">
          <ConversationList
            conversations={conversations}
            selectedPeerId={selectedConversationId}
            onSelect={selectConversation}
            isLoading={isLoading && conversations.length === 0}
          />
        </div>

        {/* Chat window */}
        <div className="flex-1 overflow-hidden">
          {selectedConversation && currentUserId ? (
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={(text, jobLeadId) =>
                sendMessage(selectedConversation.peerId, text, jobLeadId)
              }
              onMarkAsRead={markAsRead}
              isTyping={isTyping}
              isLoading={isLoading && messages.length === 0}
              isSending={false}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Konuşma seçin</p>
                <p className="text-sm">Sol tarafdan bir konuşma seçerek başlayın</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const id = localStorage.getItem('admin_user_id') || 'unknown';
    setUserId(id);
  }, []);

  if (!userId) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <ChatProvider userId={userId}>
      <ChatContent />
    </ChatProvider>
  );
}
