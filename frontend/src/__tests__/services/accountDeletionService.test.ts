import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";
import api from "../../api/axios";

// ---- Mock axios ----
vi.mock("axios", () => {
  const mockInstance = {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

// Import the module as a namespace to allow spying on its exports
import * as accountService from "../../services/accountDeletionService";

// Destructure for convenience in tests
const {
  requestAccountDeletion,
  submitDeletionFeedback,
  hasPendingDeletion,
  getPendingDeletion,
  cancelAccountDeletion,
} = accountService;

describe("accountDeletionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  // --------------------------
  // clearUserData()
  // --------------------------
  it("clearUserData should remove auth/user data but preserve theme", () => {
    localStorage.setItem("auth_token", "abc");
    localStorage.setItem("user", JSON.stringify({ id: 1 }));
    localStorage.setItem("pending_deletion", "true");
    localStorage.setItem("user-theme", "dark");

    sessionStorage.setItem("temp", "123");

    // Create a spy on clearUserData
    const clearSpy = vi.spyOn(accountService, "clearUserData");

    accountService.clearUserData();

    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("pending_deletion")).toBeNull();

    // theme must remain
    expect(localStorage.getItem("user-theme")).toBe("dark");

    // sessionStorage cleared
    expect(sessionStorage.getItem("temp")).toBeNull();
  });

  it("clearUserData should not set theme if it was not present", () => {
    localStorage.setItem("auth_token", "abc");

    accountService.clearUserData();

    expect(localStorage.getItem("user-theme")).toBeNull();
  });

  // --------------------------
  // hasPendingDeletion()
  // --------------------------
  it("hasPendingDeletion should return false if no pending_deletion key exists", () => {
    expect(hasPendingDeletion()).toBe(false);
  });

  it("hasPendingDeletion should return true if pending_deletion exists", () => {
    localStorage.setItem("pending_deletion", "true");
    expect(hasPendingDeletion()).toBe(true);
  });

  // --------------------------
  // getPendingDeletion()
  // --------------------------
  it("getPendingDeletion should return null if nothing stored", () => {
    expect(getPendingDeletion()).toBeNull();
  });

  it("getPendingDeletion should return parsed JSON if stored", () => {
    localStorage.setItem(
      "pending_deletion",
      JSON.stringify({ id: "123", reason: "test" })
    );

    expect(getPendingDeletion()).toEqual({ id: "123", reason: "test" });
  });

  // --------------------------
  // submitDeletionFeedback()
  // --------------------------
  it("submitDeletionFeedback should return success and message", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });

    const result = await submitDeletionFeedback({
      reason: "Not using",
      suggestions: "Improve UI",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Thank you for your feedback!");

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // --------------------------
  // cancelAccountDeletion()
  // --------------------------
  it("cancelAccountDeletion should return success object", async () => {
    const result = await cancelAccountDeletion("user123");

    expect(result).toEqual({
      success: true,
      message: "Deletion cancelled",
    });
  });

  // --------------------------
  // requestAccountDeletion()
  // --------------------------
  it("requestAccountDeletion should call api.delete and clearUserData if success=true", async () => {
    vi.mocked(api.delete).mockResolvedValue({
      data: { success: true, message: "Deleted" },
    });

    localStorage.setItem("auth_token", "active-token");

    const result = await requestAccountDeletion({
      email: "test@test.com",
      password: "123",
    });

    expect(api.delete).toHaveBeenCalledWith("/auth/delete-account", {
      data: { password: "123" },
    });

    // Verify clearUserData was called by its side effects
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(result).toEqual({ success: true, message: "Deleted" });
  });

  it("requestAccountDeletion should NOT clearUserData if success=false", async () => {
    vi.mocked(api.delete).mockResolvedValue({
      data: { success: false, message: "Wrong password" },
    });

    localStorage.setItem("auth_token", "active-token");

    const result = await requestAccountDeletion({
      email: "test@test.com",
      password: "bad",
    });

    expect(api.delete).toHaveBeenCalled();
    expect(localStorage.getItem("auth_token")).toBe("active-token");
    expect(result).toEqual({ success: false, message: "Wrong password" });
  });

  it("requestAccountDeletion should return error message if request fails", async () => {
    vi.mocked(api.delete).mockRejectedValue({
      response: {
        data: { message: "Internal Server Error" },
      },
    });

    const result = await requestAccountDeletion({
      email: "test@test.com",
      password: "error",
    });

    expect(result).toEqual({ success: false, message: "Internal Server Error" });
  });

  it("requestAccountDeletion should return fallback message if no backend message", async () => {
    vi.mocked(api.delete).mockRejectedValue({});

    const result = await requestAccountDeletion({
      email: "test@test.com",
      password: "err",
    });

    expect(result).toEqual({
      success: false,
      message: "Failed to delete account. Please verify your password.",
    });
  });
});
