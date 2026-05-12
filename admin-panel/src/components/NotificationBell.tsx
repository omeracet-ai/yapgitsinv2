'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCircle2 } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  refId?: string;
  relatedType?: string;
  relatedId?: string;
}

/**
 * Phase 164 — NotificationBell component for admin panel
 * Features:
 * - Real-time notification dropdown
 * - Mark as read/unread
 * - Mark all as read
 * - Unread count badge
 * - Auto-refresh on interval
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Get auth token from localStorage
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('adminToken') || '';
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      const [notifResponse, countResponse] = await Promise.all([
        fetch(`${apiUrl}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (notifResponse.ok && countResponse.ok) {
        const notifData = await notifResponse.json();
        const countData = await countResponse.json();
        setNotifications(Array.isArray(notifData) ? notifData : []);
        setUnreadCount(countData.count || 0);
      }
    } catch (error) {
      console.warn('Failed to fetch notifications:', error);
    }
  }, [apiUrl, getToken]);

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    fetchNotifications();

    // Auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(fetchNotifications, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(
          `${apiUrl}/notifications/${notificationId}/read`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.ok) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n,
            ),
          );
          setUnreadCount((count) => Math.max(0, count - 1));
        }
      } catch (error) {
        console.warn('Failed to mark notification as read:', error);
      }
    },
    [apiUrl, getToken],
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      setLoading(true);
      const response = await fetch(`${apiUrl}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true })),
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.warn('Failed to mark all as read:', error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getToken]);

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}d önce`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}s önce`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}g önce`;

    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none transition-colors"
        aria-label="Bildirimler"
        title="Bildirimler"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Bildirimler</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                title="Tümünü okundu olarak işaretle"
              >
                <CheckCircle2 size={18} className="inline mr-1" />
                Tümünü Okundu Yap
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Bildirim yok
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Okundu olarak işaretle"
                      >
                        <Check size={18} className="text-blue-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Kapat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
