import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, test, expect, it } from "vitest";
import ColorPicker from "../../../components/ui/ColorPicker";

describe("ColorPicker", () => {
  it("renders the toggle button", () => {
    render(<ColorPicker value="#3b82f6" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /open color picker/i })).toBeInTheDocument();
  });

  it("opens the dialog when clicking the button", () => {
    render(<ColorPicker value="#3b82f6" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));

    expect(screen.getByRole("dialog", { name: /color picker/i })).toBeInTheDocument();
    expect(screen.getByText("#3B82F6")).toBeInTheDocument();
  });

  it("closes the dialog when clicking Done", () => {
    render(<ColorPicker value="#3b82f6" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));
    expect(screen.getByRole("dialog", { name: /color picker/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close color picker/i }));
    expect(screen.queryByRole("dialog", { name: /color picker/i })).not.toBeInTheDocument();
  });

  it("calls onChange when a preset color is clicked", () => {
    const onChange = vi.fn();

    render(<ColorPicker value="#3b82f6" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));

    // Preset exists in your component
    const presetBtn = screen.getByRole("button", { name: "Select color #ef4444" });
    fireEvent.click(presetBtn);

    expect(onChange).toHaveBeenCalledWith("#ef4444");
  });

  it("shows check icon only for selected preset (aria-pressed=true)", () => {
    render(<ColorPicker value="#ef4444" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));

    const selected = screen.getByRole("button", { name: "Select color #ef4444" });
    const notSelected = screen.getByRole("button", { name: "Select color #3b82f6" });

    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(notSelected).toHaveAttribute("aria-pressed", "false");
  });

  it("changes color when valid hex is typed", () => {
    const onChange = vi.fn();

    render(<ColorPicker value="#3b82f6" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));

    const hexInput = screen.getByRole("textbox", { name: /enter hex color code/i });
    fireEvent.change(hexInput, { target: { value: "#ff0000" } });

    expect(onChange).toHaveBeenCalledWith("#ff0000");
  });

  it("does NOT call onChange when invalid hex is typed", () => {
    const onChange = vi.fn();

    render(<ColorPicker value="#3b82f6" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));

    const hexInput = screen.getByRole("textbox", { name: /enter hex color code/i });
    fireEvent.change(hexInput, { target: { value: "invalid" } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders opacity UI only when onOpacityChange is provided", () => {
    const { rerender } = render(<ColorPicker value="#3b82f6" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));
    expect(screen.queryByLabelText(/adjust opacity/i)).not.toBeInTheDocument();

    // Close before rerendering to reset state cleanly
    fireEvent.click(screen.getByRole("button", { name: /close color picker/i }));

    rerender(
      <ColorPicker
        value="#3b82f6"
        onChange={vi.fn()}
        opacity={0.5}
        onOpacityChange={vi.fn()}
      />
    );

    // Reopen
    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));
    expect(screen.getByLabelText(/adjust opacity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enter opacity percentage/i)).toBeInTheDocument();
  });

  it("calls onOpacityChange when opacity slider changes", () => {
    const onOpacityChange = vi.fn();

    render(
      <ColorPicker
        value="#3b82f6"
        onChange={vi.fn()}
        opacity={1}
        onOpacityChange={onOpacityChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));

    const opacitySlider = screen.getByLabelText(/adjust opacity/i);
    fireEvent.change(opacitySlider, { target: { value: "0.25" } });

    expect(onOpacityChange).toHaveBeenCalledWith(0.25);
  });

  it("calls onOpacityChange when opacity percent input changes", () => {
    const onOpacityChange = vi.fn();

    render(
      <ColorPicker
        value="#3b82f6"
        onChange={vi.fn()}
        opacity={1}
        onOpacityChange={onOpacityChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));

    const opacityInput = screen.getByRole("spinbutton", { name: /enter opacity percentage/i });
    fireEvent.change(opacityInput, { target: { value: "40" } });

    expect(onOpacityChange).toHaveBeenCalledWith(0.4);
  });

  it("closes when clicking outside (mousedown)", () => {
    render(<ColorPicker value="#3b82f6" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));
    expect(screen.getByRole("dialog", { name: /color picker/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog", { name: /color picker/i })).not.toBeInTheDocument();
  });

  it("changes hue slider -> triggers onChange with a hex value", () => {
    const onChange = vi.fn();

    render(<ColorPicker value="#3b82f6" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /open color picker/i }));

    const hueSlider = screen.getByLabelText(/adjust hue/i);

    // change hue to 120 (green-ish)
    fireEvent.change(hueSlider, { target: { value: "120" } });

    // We don't assert exact hex because conversion is internal,
    // but we DO assert it was called with a valid hex string.
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0][0];
    expect(arg).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
