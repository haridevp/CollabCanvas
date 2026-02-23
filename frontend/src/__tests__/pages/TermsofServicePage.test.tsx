// src/__tests__/pages/TermsOfServicePage.test.tsx

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, test, expect, beforeEach } from "vitest";
import TermsOfServicePage from "../../pages/TermsOfServicePage";

// Mock your Button component
vi.mock("../../components/ui/Button", () => ({
  __esModule: true,
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe("TermsOfServicePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders main heading and last updated text", () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
  });

  test("renders all main sections", () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /1\. acceptance of terms/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /2\. user accounts/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /3\. content guidelines/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /4\. intellectual property/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /5\. privacy/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /6\. termination/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /7\. changes to terms/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /8\. contact us/i })).toBeInTheDocument();
  });

  test("renders prohibited content list items", () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/content that violates any laws/i)).toBeInTheDocument();
    expect(screen.getByText(/hate speech, harassment, or discrimination/i)).toBeInTheDocument();
    expect(screen.getByText(/copyrighted material without permission/i)).toBeInTheDocument();
    expect(screen.getByText(/malicious software or code/i)).toBeInTheDocument();
    expect(screen.getByText(/spam or unauthorized advertising/i)).toBeInTheDocument();
    expect(screen.getByText(/personal information of others without consent/i)).toBeInTheDocument();
  });

  test("privacy policy link points to /privacy-policy", () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>
    );

    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
    expect(privacyLink).toHaveAttribute("href", "/privacy-policy");
  });

  test("back to registration link points to /register", () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>
    );

    // The link wraps the button. The button has text "Back to Registration"
    const backLink = screen.getByRole("link", { name: /back to registration/i });
    expect(backLink).toHaveAttribute("href", "/register");
  });

  test("clicking accept terms calls window.history.back()", () => {
    const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>
    );

    const acceptBtn = screen.getByRole("button", { name: /accept terms of service/i });
    fireEvent.click(acceptBtn);

    expect(backSpy).toHaveBeenCalledTimes(1);

    backSpy.mockRestore();
  });

  test("renders footer note", () => {
    render(
      <MemoryRouter>
        <TermsOfServicePage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/you acknowledge that you have read, understood/i)
    ).toBeInTheDocument();
  });
});
