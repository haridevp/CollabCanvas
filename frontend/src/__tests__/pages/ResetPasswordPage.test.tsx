// src/__tests__/pages/ResetPasswordPage.test.tsx

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import ResetPasswordPage from "../../pages/ResetPasswordPage";
import { resetPassword } from "../../utils/authService";

vi.mock("../../utils/authService", () => ({
  resetPassword: vi.fn(),
}));

// Mock your Button component to a normal HTML button
vi.mock("../../components/ui/Button", () => ({
  Button: ({ children, isLoading, variant, ...props }: any) => (
    <button {...props}>
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

// Mock strength meter (not needed for logic)
vi.mock("../../components/ui/PasswordStrengthMeter", () => ({
  PasswordStrengthMeter: () => <div data-testid="password-strength-meter" />,
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderPage = (token?: string | null) => {
  const url = token ? `/reset-password?token=${token}` : `/reset-password`;

  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders reset form UI", () => {
    renderPage("abc123");

    expect(
      screen.getByRole("heading", { name: /set new password/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/^New Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm New Password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update password/i })
    ).toBeInTheDocument();
  });

  it("shows error if no token is present", async () => {
    renderPage(null);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no reset token found/i
    );

    const submitBtn = screen.getByRole("button", { name: /update password/i });
    expect(submitBtn).toBeDisabled();
  });

  it("toggles password visibility when clicking show/hide button", () => {
    renderPage("abc123");

    const passwordInput = screen.getByLabelText(/^New Password$/i);
    const toggleBtn = screen.getByRole("button", { name: /show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("shows validation error when password is less than 8 chars", async () => {
    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: "123" },
    });

    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: "123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /at least 8 characters/i
    );

    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("shows validation error when passwords do not match", async () => {
    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: "password999" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /passwords do not match/i
    );

    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("calls resetPassword API with token and password on valid submit", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({ success: true, message: "Success" });

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith("abc123", "password123");
    });
  });

  it("shows success screen when resetPassword returns success", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({ success: true, message: "Success" });

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByRole("heading", { name: /password updated/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /go to login/i })
    ).toBeInTheDocument();
  });

  it("navigates to /login after 3 seconds on success", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({ success: true, message: "Success" });

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await screen.findByRole("heading", { name: /password updated/i });

    expect(mockNavigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("shows API error message when resetPassword returns success=false", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({
      success: false,
      message: "Invalid token",
    });

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid token/i);
  });

  it("shows fallback error message when resetPassword throws", async () => {
    vi.mocked(resetPassword).mockRejectedValueOnce(new Error("Network error"));

    renderPage("abc123");

    fireEvent.change(screen.getByLabelText(/^New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /failed to reset password/i
    );
  });
});
