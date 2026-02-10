import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../services/AuthContext";
import { io, Socket } from "socket.io-client";
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../../utils/notificationService";
import { Bell, X, Check, Trash2 } from "lucide-react";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedUser?: { username: string; avatar?: string };
  relatedRoom?: { name: string; roomCode: string };
  createdAt: string;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = React.useRef<Socket | null>(null);

  // Load notifications on mount
  useEffect(() => {
    if (!user) return;

    loadNotifications();
    loadUnreadCount();

    // Set up Socket.IO connection for real-time notifications
    const socketUrl =
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
      "http://localhost:5000";
    const socket = io(socketUrl);
    socketRef.current = socket;

    // Subscribe to notifications
    socket.emit("subscribe-notifications", { userId: user.id || user._id });

    // Listen for new notifications
    socket.on(
      "new-notification",
      async ({ notification }: { notification: Notification }) => {
        setNotifications((prev) => [notification, ...prev]);
        await loadUnreadCount();
      },
    );

    return () => {
      socket.emit("unsubscribe-notifications", { userId: user.id || user._id });
      socket.disconnect();
    };
  }, [user]);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getNotifications(1, 20);
      if (data.success) {
        setNotifications(data.notifications);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      if (data.success) {
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n)),
    );
    await loadUnreadCount();
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
    setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    await loadUnreadCount();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-slate-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900">
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {!notification.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification._id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full p-2 text-sm text-slate-600 hover:bg-slate-50 border-t border-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
