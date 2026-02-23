import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import api from "../../api/axios";
import {
  requestPasswordReset,
  validateResetToken,
  resetPassword,
  canRequestReset,
  trackResetRequest,
} from "../../services/passwordResetService";

// Mock the API module
vi.mock("../../api/axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("passwordResetService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("requestPasswordReset()", () => {
    it("should return error if email is invalid", async () => {
      const result = await requestPasswordReset("invalidEmail");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Please provide a valid email address");
      expect(api.post).not.toHaveBeenCalled();
    });

    it("should call API and return success on valid email", async () => {
      (api.post as any).mockResolvedValueOnce({
        data: { success: true, message: "Password reset email sent successfully" },
      });

      const result = await requestPasswordReset("user@example.com");

      expect(api.post).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "user@example.com",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Password reset email sent successfully");
    });

    it("should return failure if API call fails", async () => {
      (api.post as any).mockRejectedValueOnce({
        response: {
          data: { message: "User not found" },
        },
      });

      const result = await requestPasswordReset("user@example.com");

      expect(api.post).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "user@example.com",
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe("User not found");
    });

    it("should return default failure message if API fails without message", async () => {
      (api.post as any).mockRejectedValueOnce(new Error("Network Error"));

      const result = await requestPasswordReset("user@example.com");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to send reset email. Please try again.");
    });
  });

  describe("validateResetToken()", () => {
    it("should call API and return valid status", async () => {
      (api.post as any).mockResolvedValueOnce({
        data: { valid: true, email: "user@example.com" },
      });

      const result = await validateResetToken("valid-token");

      expect(api.post).toHaveBeenCalledWith("/auth/validate-reset-token", {
        token: "valid-token",
      });
      expect(result.valid).toBe(true);
      expect(result.email).toBe("user@example.com");
    });

    it("should return invalid if API returns invalid", async () => {
      (api.post as any).mockRejectedValueOnce({
        response: {
          data: { message: "Invalid reset token" },
        },
      });

      const result = await validateResetToken("invalid-token");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Invalid reset token");
    });
    
    it("should return valid if API returns 404 (endpoint not exists logic)", async () => {
       (api.post as any).mockRejectedValueOnce({
        response: {
          status: 404,
        },
      });

      const result = await validateResetToken("some-token");

      expect(result.valid).toBe(true);
      expect(result.message).toBe("Token will be validated on reset");
    });
  });

  describe("resetPassword()", () => {
    it("should fail if password is too short", async () => {
      const result = await resetPassword("token", "short");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Password must be at least 8 characters long");
      expect(api.post).not.toHaveBeenCalled();
    });

    it("should call API and return success", async () => {
      (api.post as any).mockResolvedValueOnce({
        data: { success: true, message: "Password has been reset successfully" },
      });

      const result = await resetPassword("valid-token", "NewPassword123!");

      expect(api.post).toHaveBeenCalledWith("/auth/reset-password", {
        token: "valid-token",
        password: "NewPassword123!",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Password has been reset successfully");
    });

    it("should return failure if API call fails", async () => {
      (api.post as any).mockRejectedValueOnce({
        response: {
          data: { message: "Invalid or expired token" },
        },
      });

      const result = await resetPassword("invalid-token", "NewPassword123!");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid or expired token");
    });
  });

  describe("canRequestReset()", () => {
    it("should return true if no previous request exists", () => {
      expect(canRequestReset("a@b.com")).toBe(true);
    });

    it("should return false if within cooldown period", () => {
      const email = "a@b.com";
      const now = new Date().toISOString();

      localStorage.setItem(`reset_request_${email}`, now);

      expect(canRequestReset(email)).toBe(false);
    });

    it("should return true if cooldown period has passed", () => {
      const email = "a@b.com";
      const oldTime = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 mins ago

      localStorage.setItem(`reset_request_${email}`, oldTime);

      expect(canRequestReset(email)).toBe(true);
    });
  });

  describe("trackResetRequest()", () => {
    it("should store reset request timestamp in localStorage", () => {
      const email = "sid@example.com";

      trackResetRequest(email);

      const stored = localStorage.getItem(`reset_request_${email}`);

      expect(stored).toBeTruthy();
      expect(new Date(stored as string).toString()).not.toBe("Invalid Date");
    });
  });
});
