import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import * as logoutModule from "../../utils/logoutHandler";
import { performLogout } from "../../utils/logoutHandler";

describe("performLogout()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    // Default mock for window.confirm
    vi.spyOn(window, "confirm").mockReturnValue(true);

    // Mock window.location.href
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return early if confirmation enabled and user cancels", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    // Set some data to check if it's NOT cleared
    localStorage.setItem("auth_token", "test-token");

    await performLogout({ showConfirmation: true });

    expect(localStorage.getItem("auth_token")).toBe("test-token");
  });

  it("should clear tokens and redirect if confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    localStorage.setItem("auth_token", "test-token");
    localStorage.setItem("user", JSON.stringify({ name: "Test" }));

    await performLogout({
      showConfirmation: true,
      showSuccess: false,
      redirectTo: "/login"
    });

    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it("should not redirect if redirectTo is empty string", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    window.location.href = "current-page";

    await performLogout({
      showConfirmation: true,
      showSuccess: false,
      redirectTo: ""
    });

    expect(window.location.href).toBe("current-page");
  });

  it("should skip confirmation if showConfirmation is false", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");

    await performLogout({
      showConfirmation: false,
      showSuccess: false,
      redirectTo: "/login"
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe("/login");
  });
});
