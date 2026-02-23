import { describe, test, expect, beforeEach, vi } from 'vitest';
import api from "../../api/axios";
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../../utils/notificationService";

vi.mock("../../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("notificationsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNotifications()", () => {
    test("should fetch notifications with correct params", async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, notifications: ["n1"] },
      });

      const result = await getNotifications(2, 10, true);

      expect(api.get).toHaveBeenCalledWith("/notifications", {
        params: { page: 2, limit: 10, unreadOnly: true },
      });

      expect(result).toEqual({ success: true, notifications: ["n1"] });
    });

    test("should return fallback response on error", async () => {
      vi.mocked(api.get).mockRejectedValueOnce({
        response: { data: { message: "Server down" } },
      });

      const result = await getNotifications(1, 20, false);

      expect(result).toEqual({
        success: false,
        message: "Server down",
        notifications: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      });
    });

    test("should return default error message if no backend message", async () => {
      vi.mocked(api.get).mockRejectedValueOnce({});

      const result = await getNotifications();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to fetch notifications");
    });
  });

  describe("getUnreadCount()", () => {
    test("should fetch unread count", async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, unreadCount: 5 },
      });

      const result = await getUnreadCount();

      expect(api.get).toHaveBeenCalledWith("/notifications/unread/count");
      expect(result).toEqual({ success: true, unreadCount: 5 });
    });

    test("should return fallback unreadCount on error", async () => {
      vi.mocked(api.get).mockRejectedValueOnce({});

      const result = await getUnreadCount();

      expect(result).toEqual({ success: false, unreadCount: 0 });
    });
  });

  describe("markNotificationAsRead()", () => {
    test("should mark a notification as read", async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true },
      });

      const result = await markNotificationAsRead("abc123");

      expect(api.post).toHaveBeenCalledWith("/notifications/abc123/read");
      expect(result).toEqual({ success: true });
    });

    test("should return fallback response on error", async () => {
      vi.mocked(api.post).mockRejectedValueOnce({
        response: { data: { message: "Not found" } },
      });

      const result = await markNotificationAsRead("badid");

      expect(result).toEqual({
        success: false,
        message: "Not found",
      });
    });
  });

  describe("markAllNotificationsAsRead()", () => {
    test("should mark all notifications as read", async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true },
      });

      const result = await markAllNotificationsAsRead();

      expect(api.post).toHaveBeenCalledWith("/notifications/mark-all-read");
      expect(result).toEqual({ success: true });
    });

    test("should return fallback response on error", async () => {
      vi.mocked(api.post).mockRejectedValueOnce({});

      const result = await markAllNotificationsAsRead();

      expect(result).toEqual({
        success: false,
        message: "Failed to mark all as read",
      });
    });
  });

  describe("deleteNotification()", () => {
    test("should delete notification", async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({
        data: { success: true },
      });

      const result = await deleteNotification("del123");

      expect(api.delete).toHaveBeenCalledWith("/notifications/del123");
      expect(result).toEqual({ success: true });
    });

    test("should return fallback response on error", async () => {
      vi.mocked(api.delete).mockRejectedValueOnce({
        response: { data: { message: "Delete failed" } },
      });

      const result = await deleteNotification("x");

      expect(result).toEqual({
        success: false,
        message: "Delete failed",
      });
    });
  });
});
