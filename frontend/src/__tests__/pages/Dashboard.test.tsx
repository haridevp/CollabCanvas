import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Dashboard from "../../pages/Dashboard";

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual: any = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Sidebar
vi.mock("../../components/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

// Mock Modals
vi.mock("../../features/rooms/RoomCreationModal", () => ({
  default: ({ isOpen }: any) =>
    isOpen ? <div data-testid="create-modal">Create Modal</div> : null,
}));

vi.mock("../../features/rooms/RoomJoinModal", () => ({
  default: ({ isOpen }: any) =>
    isOpen ? <div data-testid="join-modal">Join Modal</div> : null,
}));

// Mock Room Card Component
vi.mock("../../components/ui/RoomCardComponent", () => ({
  default: ({ name }: any) => <div data-testid="room-card">{name}</div>,
}));

// Mock AuthContext
vi.mock("../../services/AuthContext", () => ({
  useAuth: () => ({
    user: {
      fullName: "Sidharth",
      username: "sid-error",
    },
  }),
}));

// Mock roomService
const mockGetMyRooms = vi.fn();
const mockGetPublicRooms = vi.fn();

vi.mock("../../services/roomService", () => ({
  default: {
    getMyRooms: (...args: any[]) => mockGetMyRooms(...args),
    getPublicRooms: (...args: any[]) => mockGetPublicRooms(...args),
  },
}));

describe("Dashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dashboard header and welcome user", async () => {
    mockGetMyRooms.mockResolvedValueOnce({ success: true, rooms: [] });

    render(<Dashboard />);

    expect(
      screen.getByText("Collaborative Canvas Workspace")
    ).toBeInTheDocument();

    expect(screen.getByText("Sidharth")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetMyRooms).toHaveBeenCalled();
    });
  });

  it("shows loading spinner while fetching rooms", async () => {
    mockGetMyRooms.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true, rooms: [] }), 100)
        )
    );

    render(<Dashboard />);

    expect(screen.getByText("Loading rooms...")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetMyRooms).toHaveBeenCalled();
    });
  });

  it("loads and displays my rooms", async () => {
    mockGetMyRooms.mockResolvedValueOnce({
      success: true,
      rooms: [
        {
          id: "1",
          name: "Room One",
          description: "Test room",
          isPublic: false,
          ownerName: "Sidharth",
          participantCount: 2,
          maxParticipants: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Room One")).toBeInTheDocument();
    });
  });

  it("filters rooms by search query", async () => {
    mockGetMyRooms.mockResolvedValueOnce({
      success: true,
      rooms: [
        {
          id: "1",
          name: "Alpha Room",
          description: "Test",
          isPublic: false,
          ownerName: "Sidharth",
          participantCount: 2,
          maxParticipants: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          name: "Beta Room",
          description: "Test",
          isPublic: false,
          ownerName: "Sidharth",
          participantCount: 2,
          maxParticipants: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Alpha Room")).toBeInTheDocument();
      expect(screen.getByText("Beta Room")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const searchInput = screen.getByLabelText("Search rooms");
    await user.type(searchInput, "Alpha");

    expect(screen.getByText("Alpha Room")).toBeInTheDocument();
    expect(screen.queryByText("Beta Room")).not.toBeInTheDocument();
  });

  it("switches to Public Rooms tab and loads public rooms", async () => {
    mockGetMyRooms.mockResolvedValueOnce({ success: true, rooms: [] });

    mockGetPublicRooms.mockResolvedValueOnce({
      success: true,
      rooms: [
        {
          id: "10",
          name: "Public Room",
          description: "Public test",
          isPublic: true,
          ownerName: "Admin",
          participantCount: 8,
          maxParticipants: 20,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    render(<Dashboard />);

    await waitFor(() => expect(mockGetMyRooms).toHaveBeenCalled());

    const publicTab = screen.getByRole("button", { name: /Public Rooms/i });
    fireEvent.click(publicTab);

    await waitFor(() => {
      expect(mockGetPublicRooms).toHaveBeenCalled();
      expect(screen.getByTestId("room-card")).toHaveTextContent("Public Room");
    });
  });

  it("opens Join Room modal when Join button clicked", async () => {
    mockGetMyRooms.mockResolvedValueOnce({ success: true, rooms: [] });

    render(<Dashboard />);

    await waitFor(() => expect(mockGetMyRooms).toHaveBeenCalled());

    const joinButton = screen.getByRole("button", { name: /Join existing room/i });
    fireEvent.click(joinButton);

    expect(screen.getByTestId("join-modal")).toBeInTheDocument();
  });

  it("opens Create Room modal when New Room clicked", async () => {
    mockGetMyRooms.mockResolvedValueOnce({ success: true, rooms: [] });

    render(<Dashboard />);

    await waitFor(() => expect(mockGetMyRooms).toHaveBeenCalled());

    const newRoomButton = screen.getByRole("button", { name: /Create new room/i });
    fireEvent.click(newRoomButton);

    expect(screen.getByTestId("create-modal")).toBeInTheDocument();
  });

  it("changes sort option triggers getPublicRooms call", async () => {
    mockGetMyRooms.mockResolvedValueOnce({ success: true, rooms: [] });

    mockGetPublicRooms.mockResolvedValue({
      success: true,
      rooms: [],
    });

    render(<Dashboard />);

    await waitFor(() => expect(mockGetMyRooms).toHaveBeenCalled());

    // Switch to public tab
    fireEvent.click(screen.getByRole("button", { name: /Public Rooms/i }));

    await waitFor(() => expect(mockGetPublicRooms).toHaveBeenCalled());

    const sortSelect = screen.getByLabelText("Sort rooms by");

    fireEvent.change(sortSelect, { target: { value: "popular" } });

    await waitFor(() => {
      expect(mockGetPublicRooms).toHaveBeenCalledWith({ sort: "popular" });
    });
  });
});
