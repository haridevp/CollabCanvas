import React from "react";
import { render, screen } from "@testing-library/react";
import CharacterCounter from "../../../components/ui/CharacterCounter";

describe("CharacterCounter", () => {
  test("renders remaining message and count (normal state)", () => {
    render(<CharacterCounter currentLength={10} maxLength={100} />);

    expect(screen.getByText("90 characters remaining")).toBeInTheDocument();
    expect(screen.getByText("10/100")).toBeInTheDocument();

    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "10");
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
  });

  test("renders singular character correctly", () => {
    render(<CharacterCounter currentLength={99} maxLength={100} />);

    expect(screen.getByText("1 character remaining")).toBeInTheDocument();
    expect(screen.getByText("99/100")).toBeInTheDocument();
  });

  test("renders warning state when percentage >= warningThreshold and < 100", () => {
    render(
      <CharacterCounter currentLength={80} maxLength={100} warningThreshold={80} />
    );

    // warning message still remaining
    expect(screen.getByText("20 characters remaining")).toBeInTheDocument();

    // warning color applied
    const root = screen.getByRole("status");
    expect(root.className).toContain("text-yellow-600");
  });

  test("renders danger state when currentLength > maxLength", () => {
    render(<CharacterCounter currentLength={110} maxLength={100} />);

    expect(screen.getByText("Exceeds limit by 10 characters")).toBeInTheDocument();
    expect(screen.getByText("110/100")).toBeInTheDocument();

    const root = screen.getByRole("status");
    expect(root.className).toContain("text-red-600");
  });

  test("does not render message when showMessage=false", () => {
    render(
      <CharacterCounter currentLength={10} maxLength={100} showMessage={false} />
    );

    expect(screen.queryByText("90 characters remaining")).not.toBeInTheDocument();
    expect(screen.queryByText("10/100")).not.toBeInTheDocument();

    // progressbar still exists
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("progress bar width is capped at 100% when exceeding limit", () => {
    render(<CharacterCounter currentLength={150} maxLength={100} />);

    const progress = screen.getByRole("progressbar");
    const inner = progress.firstElementChild as HTMLElement;

    expect(inner.style.width).toBe("100%");
  });

  test("progress bar has minWidth when currentLength > 0", () => {
    render(<CharacterCounter currentLength={1} maxLength={100} />);

    const progress = screen.getByRole("progressbar");
    const inner = progress.firstElementChild as HTMLElement;

    expect(inner.style.minWidth).toBe("0.25rem");
  });

  test("progress bar has minWidth 0 when currentLength = 0", () => {
    render(<CharacterCounter currentLength={0} maxLength={100} />);

    const progress = screen.getByRole("progressbar");
    const inner = progress.firstElementChild as HTMLElement;

    expect(inner.style.minWidth).toBe("0");
  });

  test("applies custom className", () => {
    render(
      <CharacterCounter currentLength={10} maxLength={100} className="mt-4" />
    );

    const root = screen.getByRole("status");
    expect(root.className).toContain("mt-4");
  });

  test("progressbar aria-label shows percentage", () => {
    render(<CharacterCounter currentLength={25} maxLength={100} />);

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Character usage: 25%"
    );
  });
});
