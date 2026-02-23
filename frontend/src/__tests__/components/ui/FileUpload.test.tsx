import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import FileUpload from "../../../components/ui/FileUpload";

const makeFile = (name: string, size: number, type = "image/png") => {
  // size here is in bytes
  const file = new File(["a".repeat(10)], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("FileUpload", () => {
  beforeEach(() => {
    // Mock URL.createObjectURL (used for preview)
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders upload area initially", () => {
    render(<FileUpload onFileSelect={vi.fn()} />);

    expect(
      screen.getByRole("button", {
        name: /file upload area/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/click to upload or drag and drop/i)).toBeInTheDocument();
  });

  it("selects a valid file and calls onFileSelect(file)", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);

    // Use strict regex to match input aria-label "File upload" only
    const input = screen.getByLabelText(/^File upload$/i) as HTMLInputElement;

    const file = makeFile("test.png", 1024 * 1024); // 1MB

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(screen.getByText("test.png")).toBeInTheDocument();
    expect(screen.getByText(/ready to upload/i)).toBeInTheDocument();

    // Preview should render
    expect(screen.getByAltText("Preview of test.png")).toBeInTheDocument();
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it("rejects unsupported file format and calls onFileSelect(null)", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);

    const input = screen.getByLabelText(/^File upload$/i);

    const file = makeFile("bad.pdf", 5000, "application/pdf");

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(null);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unsupported file format. Please use .jpg, .jpeg, .png, .webp"
    );
  });

  it("rejects file larger than maxSizeMB and calls onFileSelect(null)", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} maxSizeMB={5} />);

    const input = screen.getByLabelText(/^File upload$/i);

    const tooBig = makeFile("big.png", 6 * 1024 * 1024); // 6MB

    fireEvent.change(input, { target: { files: [tooBig] } });

    expect(onFileSelect).toHaveBeenCalledWith(null);

    expect(screen.getByRole("alert")).toHaveTextContent("File size exceeds 5MB limit");
  });

  it("removes selected file when clicking remove button", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);

    const input = screen.getByLabelText(/^File upload$/i);

    const file = makeFile("test.png", 1024);

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("test.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove file/i }));

    expect(onFileSelect).toHaveBeenLastCalledWith(null);

    // back to upload area
    expect(
      screen.getByRole("button", { name: /file upload area/i })
    ).toBeInTheDocument();
  });

  it("supports drag over -> adds dragging styles", () => {
    render(<FileUpload onFileSelect={vi.fn()} />);

    const dropArea = screen.getByRole("button", { name: /file upload area/i });

    fireEvent.dragOver(dropArea);

    // isDragging makes it use border-blue-500
    expect(dropArea.className).toContain("border-blue-500");
  });

  it("supports drag leave -> removes dragging styles", () => {
    render(<FileUpload onFileSelect={vi.fn()} />);

    const dropArea = screen.getByRole("button", { name: /file upload area/i });

    fireEvent.dragOver(dropArea);
    expect(dropArea.className).toContain("border-blue-500");

    fireEvent.dragLeave(dropArea);
    expect(dropArea.className).not.toContain("border-blue-500");
  });

  it("supports dropping a valid file and calls onFileSelect(file)", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);

    const dropArea = screen.getByRole("button", { name: /file upload area/i });

    const file = makeFile("drop.png", 1024);

    fireEvent.drop(dropArea, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(onFileSelect).toHaveBeenCalledWith(file);
    expect(screen.getByText("drop.png")).toBeInTheDocument();
  });

  it("does not select invalid dropped file (wrong extension)", () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);

    const dropArea = screen.getByRole("button", { name: /file upload area/i });

    const file = makeFile("drop.txt", 1000, "text/plain");

    fireEvent.drop(dropArea, {
      dataTransfer: {
        files: [file],
      },
    });

    // validateFile fails -> no selection
    expect(onFileSelect).not.toHaveBeenCalledWith(file);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unsupported file format. Please use .jpg, .jpeg, .png, .webp"
    );
  });

  it("opens file input when pressing Enter on upload area", () => {
    render(<FileUpload onFileSelect={vi.fn()} />);

    const input = screen.getByLabelText(/^File upload$/i) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    const dropArea = screen.getByRole("button", { name: /file upload area/i });

    fireEvent.keyDown(dropArea, { key: "Enter" });

    expect(clickSpy).toHaveBeenCalled();
  });

  it("opens file input when pressing Space on upload area", () => {
    render(<FileUpload onFileSelect={vi.fn()} />);

    const input = screen.getByLabelText(/^File upload$/i) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    const dropArea = screen.getByRole("button", { name: /file upload area/i });

    fireEvent.keyDown(dropArea, { key: " " });

    expect(clickSpy).toHaveBeenCalled();
  });

  it("shows custom accepted formats + maxSizeMB in UI", () => {
    render(
      <FileUpload
        onFileSelect={vi.fn()}
        acceptedFormats={[".png"]}
        maxSizeMB={10}
      />
    );

    expect(screen.getByText(".PNG (Max 10MB)")).toBeInTheDocument();
  });
});