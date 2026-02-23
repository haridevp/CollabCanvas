import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, test, expect, beforeEach } from "vitest";
import BrushSettings from "../../../components/ui/BrushSettings";

describe("BrushSettings", () => {
  const defaultProps = {
    strokeWidth: 5,
    onStrokeWidthChange: vi.fn(),
    brushType: "pencil" as const,
    onBrushTypeChange: vi.fn(),
    pressureSensitive: false,
    onPressureSensitiveChange: vi.fn(),
    strokeStyle: {
      type: "solid" as const,
      dashArray: [],
      lineCap: "round" as const,
      lineJoin: "round" as const,
    },
    onStrokeStyleChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders brush preview button with current brush and width", () => {
    render(<BrushSettings {...defaultProps} />);

    expect(screen.getByLabelText("Open brush settings")).toBeInTheDocument();
    expect(screen.getByText("Pencil")).toBeInTheDocument();
    expect(screen.getByText("5px")).toBeInTheDocument();
  });

  test("opens dropdown when preview button clicked", () => {
    render(<BrushSettings {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));

    expect(screen.getByText("Brush Type")).toBeInTheDocument();
    expect(screen.getByText("Stroke Width")).toBeInTheDocument();
    expect(screen.getByText("Stroke Style")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  test("calls onBrushTypeChange when selecting a brush", () => {
    render(<BrushSettings {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));
    fireEvent.click(screen.getByLabelText("Select Brush brush"));

    expect(defaultProps.onBrushTypeChange).toHaveBeenCalledWith("brush");
  });

  test("adjusts strokeWidth if switching brush requires higher minimum", () => {
    const props = {
      ...defaultProps,
      strokeWidth: 1,
    };

    render(<BrushSettings {...props} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));

    // airbrush minWidth = 10
    fireEvent.click(screen.getByLabelText("Select Airbrush brush"));

    expect(props.onBrushTypeChange).toHaveBeenCalledWith("airbrush");
    expect(props.onStrokeWidthChange).toHaveBeenCalledWith(10);
  });

  test("adjusts strokeWidth if switching brush requires lower maximum", () => {
    const props = {
      ...defaultProps,
      strokeWidth: 50,
    };

    render(<BrushSettings {...props} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));

    // pencil maxWidth = 10
    fireEvent.click(screen.getByLabelText("Select Pencil brush"));

    expect(props.onBrushTypeChange).toHaveBeenCalledWith("pencil");
    expect(props.onStrokeWidthChange).toHaveBeenCalledWith(10);
  });

  test("calls onStrokeWidthChange when slider changes", () => {
    render(<BrushSettings {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));

    const slider = screen.getByRole("slider");
    // Range inputs trigger change/input events. React's onChange usually covers both.
    fireEvent.change(slider, { target: { value: "8" } });

    expect(defaultProps.onStrokeWidthChange).toHaveBeenCalledWith(8);
  });

  test("calls onStrokeWidthChange when preset button clicked", () => {
    render(<BrushSettings {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));

    fireEvent.click(screen.getByText("10px"));

    expect(defaultProps.onStrokeWidthChange).toHaveBeenCalledWith(10);
  });

  test("calls onStrokeStyleChange when selecting dashed", () => {
    render(<BrushSettings {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));
    fireEvent.click(screen.getByText("Dashed"));

    expect(defaultProps.onStrokeStyleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "dashed",
        dashArray: [5, 5],
      })
    );
  });

  test("calls onStrokeStyleChange when selecting dotted", () => {
    render(<BrushSettings {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));
    fireEvent.click(screen.getByText("Dotted"));

    expect(defaultProps.onStrokeStyleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "dotted",
        dashArray: [1, 3],
      })
    );
  });

  test("calls onStrokeStyleChange when changing line cap", () => {
    render(<BrushSettings {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));

    // Line cap buttons have title = "Butt", "Round", "Square"
    const buttButton = screen.getByTitle("Butt");
    fireEvent.click(buttButton);

    expect(defaultProps.onStrokeStyleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lineCap: "butt",
      })
    );
  });

  test("toggles pressure sensitivity", () => {
    render(<BrushSettings {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));

    fireEvent.click(screen.getByText("Disabled"));

    expect(defaultProps.onPressureSensitiveChange).toHaveBeenCalledWith(true);
  });

  test("closes dropdown when Apply Settings clicked", () => {
    render(<BrushSettings {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Open brush settings"));
    expect(screen.getByText("Apply Settings")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Apply Settings"));

    expect(screen.queryByText("Brush Type")).not.toBeInTheDocument();
  });
});
