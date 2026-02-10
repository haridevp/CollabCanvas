import api from "../api/axios";

// Get all notifications
export const getNotifications = async (
  page = 1,
  limit = 20,
  unreadOnly = false,
) => {
  try {
    const response = await api.get(`/notifications`, {
      params: { page, limit, unreadOnly },
    });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch notifications",
      notifications: [],
      pagination: { page, limit, total: 0, pages: 0 },
    };
  }
};

// Get unread notification count
export const getUnreadCount = async () => {
  try {
    const response = await api.get(`/notifications/unread/count`);
    return response.data;
  } catch (error: any) {
    return { success: false, unreadCount: 0 };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to mark as read",
    };
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  try {
    const response = await api.post(`/notifications/mark-all-read`);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to mark all as read",
    };
  }
};

// Delete notification
export const deleteNotification = async (notificationId: string) => {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || "Failed to delete notification",
    };
  }
};
