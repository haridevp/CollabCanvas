import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import RoomSettingsPanel from '../../../features/rooms/RoomSettingsPanel';
import roomService from '../../../services/roomService';

// Define a type for the mocked service to avoid 'any' warnings
type MockedRoomService = {
  updateRoom: ReturnType<typeof vi.fn>;
  deleteRoom: ReturnType<typeof vi.fn>;
};

// ---- Mock the service ----
vi.mock('../../../services/roomService', () => ({
  default: {
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
  },
}));

const mockedRoomService = roomService as unknown as MockedRoomService;

// ---- Mock Room Data ----
const mockRoom = {
  id: 'room-123',
  name: 'Test Room',
  description: 'A test room',
  isPublic: true,
  maxParticipants: 10,
  participantCount: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ownerId: 'user-1',
  ownerName: 'Sidharth',
  hasPassword: false,
};

describe('RoomSettingsPanel', () => {
  const onClose = vi.fn();
  const onSettingsUpdated = vi.fn();
  const onRoomDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <RoomSettingsPanel
        room={mockRoom}
        currentUserRole="owner"
        isOpen={true}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Room Settings/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Room')).toBeInTheDocument();
    // "Participants" appears in label and status, so we expect at least one
    expect(screen.getAllByText(/Participants/i)[0]).toBeInTheDocument();
  });

  it('updates form values on input change', () => {
    render(
      <RoomSettingsPanel
        room={mockRoom}
        currentUserRole="owner"
        isOpen={true}
        onClose={onClose}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Room');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(nameInput).toHaveValue('New Name');

    const descInput = screen.getByDisplayValue('A test room');
    fireEvent.change(descInput, { target: { value: 'Updated description' } });
    expect(descInput).toHaveValue('Updated description');
  });

  it('calls roomService.updateRoom and triggers onSettingsUpdated on save', async () => {
    mockedRoomService.updateRoom.mockResolvedValue({ success: true });

    render(
      <RoomSettingsPanel
        room={mockRoom}
        currentUserRole="owner"
        isOpen={true}
        onClose={onClose}
        onSettingsUpdated={onSettingsUpdated}
      />
    );

    const saveButton = screen.getByText(/Save Changes/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockedRoomService.updateRoom).toHaveBeenCalledWith(
        'room-123',
        expect.any(Object)
      );
      expect(onSettingsUpdated).toHaveBeenCalled();
    });
  });

  it('shows error if room name is empty on save', async () => {
    render(
      <RoomSettingsPanel
        room={mockRoom}
        currentUserRole="owner"
        isOpen={true}
        onClose={onClose}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Room');
    fireEvent.change(nameInput, { target: { value: '' } });

    const saveButton = screen.getByText(/Save Changes/i);
    fireEvent.click(saveButton);

    expect(await screen.findByText(/Room name is required/i)).toBeInTheDocument();
  });

  it('copies room ID and link to clipboard', async () => {
    const writeTextMock = vi.fn();
    // Use a more robust mock for clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    render(
      <RoomSettingsPanel
        room={mockRoom}
        currentUserRole="owner"
        isOpen={true}
        onClose={onClose}
      />
    );

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    fireEvent.click(copyButtons[0]);
    expect(writeTextMock).toHaveBeenCalledWith('room-123');

    fireEvent.click(copyButtons[1]);
    expect(writeTextMock).toHaveBeenCalledWith(`${window.location.origin}/room/room-123`);
  });

  it('handles delete room flow', async () => {
    mockedRoomService.deleteRoom.mockResolvedValue({ success: true });

    render(
      <RoomSettingsPanel
        room={mockRoom}
        currentUserRole="owner"
        isOpen={true}
        onClose={onClose}
        onRoomDeleted={onRoomDeleted}
      />
    );

    fireEvent.click(screen.getByText(/Delete Room Permanently/i));
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Yes, Delete Room/i));

    await waitFor(() => {
      expect(mockedRoomService.deleteRoom).toHaveBeenCalledWith('room-123');
      expect(onRoomDeleted).toHaveBeenCalledWith('room-123');
    });
  });

  it('closes panel on cancel delete', () => {
    render(
      <RoomSettingsPanel
        room={mockRoom}
        currentUserRole="owner"
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText(/Delete Room Permanently/i));
    fireEvent.click(screen.getByText(/Cancel/i));

    expect(screen.queryByText(/This action cannot be undone/i)).not.toBeInTheDocument();
  });
});
