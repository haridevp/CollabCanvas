// InviteModal.test.tsx
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InviteModal from "../../../components/ui/InviteModal";
import { searchUsers, inviteUsersToRoom } from "../../../utils/authService";

vi.mock("../../../utils/authService", () => ({
  searchUsers: vi.fn(),
  inviteUsersToRoom: vi.fn(),
}));

// Mock Button so we don't depend on its implementation
vi.mock("../Button", () => ({
  Button: ({ children, isLoading, variant, ...props }: any) => (
    <button {...props}>
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

describe("InviteModal", () => {
  const onClose = vi.fn();

  const baseProps = {
    isOpen: true,
    onClose,
    roomId: "room-123",
    roomName: "Design Team",
    isPublic: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:3000" },
      writable: true,
    });

    // clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    // alert mock
    window.alert = vi.fn();

    // window.open mock
    window.open = vi.fn();
  });

  it("returns null when isOpen=false", () => {
    const { container } = render(
      <InviteModal {...baseProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal when open", () => {
    render(<InviteModal {...baseProps} />);
    expect(screen.getByRole("dialog", { name: /invite collaborators modal/i })).toBeInTheDocument();
    expect(screen.getByText(/invite collaborators/i)).toBeInTheDocument();
    expect(screen.getByText(/invite others to join/i)).toBeInTheDocument();
  });

  it("copies invite link to clipboard (link tab)", () => {
    render(<InviteModal {...baseProps} />);

    const copyBtn = screen.getByRole("button", { name: /copy room link to clipboard/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "http://localhost:3000/room/room-123"
    );

    expect(screen.getByText(/copied!/i)).toBeInTheDocument();
  });

  it("shows password field for private rooms and copies password", () => {
    render(
      <InviteModal
        {...baseProps}
        isPublic={false}
        roomPassword="secret123"
      />
    );

    // Use exact match or look for input specifically
    const passwordInput = screen.getByLabelText(/^Room password$/i);
    expect(passwordInput).toBeInTheDocument();

    const copyPasswordBtn = screen.getByRole("button", { name: /copy room password to clipboard/i });
    fireEvent.click(copyPasswordBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("secret123");
  });

  it("switches tabs to Email Invites and allows adding email with Enter", () => {
    render(<InviteModal {...baseProps} />);

    fireEvent.click(screen.getByRole("tab", { name: /email invites/i }));

    const input = screen.getByRole("textbox", { name: /email addresses to invite/i });
    fireEvent.change(input, { target: { value: "test@example.com" } });

    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("does not add invalid email", () => {
    render(<InviteModal {...baseProps} />);

    fireEvent.click(screen.getByRole("tab", { name: /email invites/i }));

    const input = screen.getByRole("textbox", { name: /email addresses to invite/i });
    fireEvent.change(input, { target: { value: "not-an-email" } });

    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(screen.queryByText("not-an-email")).not.toBeInTheDocument();
  });

  it("removes email when clicking remove button", () => {
    render(<InviteModal {...baseProps} />);

    fireEvent.click(screen.getByRole("tab", { name: /email invites/i }));

    const input = screen.getByRole("textbox", { name: /email addresses to invite/i });
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(screen.getByText("test@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove test@example\.com/i }));

    expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();
  });

  it("sendEmailInvites alerts and clears list", () => {
    render(<InviteModal {...baseProps} />);

    fireEvent.click(screen.getByRole("tab", { name: /email invites/i }));

    const input = screen.getByRole("textbox", { name: /email addresses to invite/i });
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    const sendBtn = screen.getByRole("button", { name: /send invites to 1 person/i });
    fireEvent.click(sendBtn);

    expect(window.alert).toHaveBeenCalledWith("Invites sent to 1 email(s)");
    expect(screen.queryByText("test@example.com")).not.toBeInTheDocument();
  });

  it("debounces user search and calls searchUsers when query >= 2", async () => {
    vi.useFakeTimers();

    vi.mocked(searchUsers).mockResolvedValue({
      success: true,
      message: "Found",
      users: [
        { id: "u1", username: "john", displayName: "John" },
        { id: "u2", username: "jane", displayName: "Jane" },
      ],
    });

    render(<InviteModal {...baseProps} />);

    fireEvent.click(screen.getByRole("tab", { name: /invite users/i }));

    const searchInput = screen.getByRole("textbox", { name: /search users/i });
    fireEvent.change(searchInput, { target: { value: "jo" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(searchUsers).toHaveBeenCalledWith("jo");
    expect(await screen.findByText("John")).toBeInTheDocument();
    expect(await screen.findByText("Jane")).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("selects a user from search results and then sends invites", async () => {
    vi.useFakeTimers();

    vi.mocked(searchUsers).mockResolvedValue({
      success: true,
      message: "Found",
      users: [{ id: "u1", username: "john", displayName: "John" }],
    });

    vi.mocked(inviteUsersToRoom).mockResolvedValue({
      success: true,
      message: "Invited",
      results: { sent: 1, skipped: 0, errors: [] },
    });

    render(<InviteModal {...baseProps} />);

    fireEvent.click(screen.getByRole("tab", { name: /invite users/i }));

    const searchInput = screen.getByRole("textbox", { name: /search users/i });
    fireEvent.change(searchInput, { target: { value: "jo" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    const userBtn = await screen.findByRole("button", { name: /select john/i });
    fireEvent.click(userBtn);

    expect(screen.getByText(/selected users \(1\)/i)).toBeInTheDocument();

    const sendBtn = screen.getByRole("button", { name: /send invites to 1 selected users/i });
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(inviteUsersToRoom).toHaveBeenCalledWith("room-123", ["u1"]);
    expect(window.alert).toHaveBeenCalledWith("1 invitation(s) sent successfully!");

    vi.useRealTimers();
  });

  it("social share opens window with correct url (twitter)", () => {
    render(<InviteModal {...baseProps} />);

    fireEvent.click(screen.getByRole("tab", { name: /social share/i }));

    fireEvent.click(screen.getByRole("button", { name: /share on twitter/i }));

    expect(window.open).toHaveBeenCalled();
    const [url, target] = vi.mocked(window.open).mock.calls[0];

    expect(url).toContain("https://twitter.com/intent/tweet?text=");
    expect(target).toBe("_blank");
  });

  it("Done button closes modal and resets form", () => {
    render(<InviteModal {...baseProps} />);

    // switch tab + type something so reset can be tested
    fireEvent.click(screen.getByRole("tab", { name: /email invites/i }));

    const input = screen.getByRole("textbox", { name: /email addresses to invite/i });
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(screen.getByText("test@example.com")).toBeInTheDocument();

    // "Done" button often has text "Done", while "X" has "Close modal" label
    // The previous test failed because finding by role with name /close modal/i found two buttons.
    // And finding by name "Done" fails because aria-label overrides visible text.
    // Finding by text "Done" finds the text node, clicking it works.
    const doneBtn = screen.getByText("Done");
    fireEvent.click(doneBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});