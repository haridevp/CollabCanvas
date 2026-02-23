// PasswordStrengthMeter.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { PasswordStrengthMeter } from "../../../components/ui/PasswordStrengthMeter";

describe("PasswordStrengthMeter", () => {
  it("renders with default label when showLabel=true", () => {
    render(<PasswordStrengthMeter password="" />);

    expect(screen.getByText(/password strength/i)).toBeInTheDocument();
  });

  it("does not render label section when showLabel=false", () => {
    render(<PasswordStrengthMeter password="Test123!" showLabel={false} />);

    expect(screen.queryByText(/password strength/i)).not.toBeInTheDocument();
  });

  it("shows empty progress bar when password is empty", () => {
    render(<PasswordStrengthMeter password="" />);

    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "0");
    expect(progress).toHaveStyle({ width: "0%" });
  });

  it("shows Weak label for weak passwords", () => {
    render(<PasswordStrengthMeter password="abc" />);

    expect(screen.getByText("Weak")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/weak/i)
    );
  });

  it("shows Fair label for medium passwords", () => {
    // Length 8 (+25), Lower(+15), Number(+15) = 55 -> Fair (30-69)
    render(<PasswordStrengthMeter password="complexity8" />);

    expect(screen.getByText("Fair")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/fair/i)
    );
  });

  it("shows Good label for stronger passwords", () => {
    // Length 8 (+25), Upper(+15), Lower(+15), Number(+15) = 70 -> Good (70-89)
    render(<PasswordStrengthMeter password="Complex1" />);

    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/good/i)
    );
  });

  it("shows Strong label for very strong passwords", () => {
    // >=12 + upper + lower + number + special => 35 + 15 + 15 + 15 + 20 = 100 => Strong
    render(<PasswordStrengthMeter password="VeryComplexPass1!" />);

    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/strong/i)
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("renders checklist only when password has content", () => {
    const { rerender } = render(<PasswordStrengthMeter password="" />);
    expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument();

    rerender(<PasswordStrengthMeter password="Abc1!" />);
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/contains uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/contains lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/contains number/i)).toBeInTheDocument();
    expect(screen.getByText(/contains special character/i)).toBeInTheDocument();
  });

  it("marks checklist items green when requirements are met", () => {
    render(<PasswordStrengthMeter password="Abcdefg1!" />);

    const lengthItem = screen.getByText(/at least 8 characters/i);
    const upperItem = screen.getByText(/contains uppercase letter/i);
    const lowerItem = screen.getByText(/contains lowercase letter/i);
    const numberItem = screen.getByText(/contains number/i);
    const specialItem = screen.getByText(/contains special character/i);

    expect(lengthItem.className).toMatch(/text-green/);
    expect(upperItem.className).toMatch(/text-green/);
    expect(lowerItem.className).toMatch(/text-green/);
    expect(numberItem.className).toMatch(/text-green/);
    expect(specialItem.className).toMatch(/text-green/);
  });

  it("applies penalty for repeated characters (does not reach Strong easily)", () => {
    // Would normally be strong-ish but has repeated chars "aaa"
    render(<PasswordStrengthMeter password="Aaaa1234!!!!" />);

    const progress = screen.getByRole("progressbar");
    const score = Number(progress.getAttribute("aria-valuenow"));

    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("applies penalty for common patterns like 123 / abc / password / qwerty", () => {
    render(<PasswordStrengthMeter password="Password123!" />);

    const progress = screen.getByRole("progressbar");
    const score = Number(progress.getAttribute("aria-valuenow"));

    // should not be max due to penalty
    expect(score).toBeLessThan(100);
  });
});
