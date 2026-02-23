// src/__tests__/pages/RegistrationSuccess.test.tsx

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RegistrationSuccess from "../../pages/RegistrationSuccess";

const renderWithRouter = (state?: any) => {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/registration-success",
          state,
        } as any,
      ]}
    >
      <Routes>
        <Route
          path="/registration-success"
          element={<RegistrationSuccess />}
        />
      </Routes>
    </MemoryRouter>
  );
};

describe("RegistrationSuccess", () => {
  it("renders the main heading", () => {
    renderWithRouter({ email: "test@example.com" });

    expect(
      screen.getByRole("heading", { name: /check your email/i })
    ).toBeInTheDocument();
  });

  it("shows email from navigation state when provided", () => {
    renderWithRouter({ email: "test@example.com" });

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it('shows fallback text "your email" when no state is provided', () => {
    renderWithRouter(undefined);

    expect(screen.getByText("your email")).toBeInTheDocument();
  });

  it("renders next steps instructions region", () => {
    renderWithRouter({ email: "test@example.com" });

    expect(
      screen.getByRole("region", { name: /next steps instructions/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/click the link in the email to activate your account/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/check your spam folder if you don't see it within a few minutes/i)
    ).toBeInTheDocument();
  });

  it("renders Back to Login link with correct href", () => {
    renderWithRouter({ email: "test@example.com" });

    const link = screen.getByRole("link", { name: /return to login page/i });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/login");
  });

  it("renders the alert message container", () => {
    renderWithRouter({ email: "test@example.com" });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText(/we've sent a verification link to/i)
    ).toBeInTheDocument();
  });
});
