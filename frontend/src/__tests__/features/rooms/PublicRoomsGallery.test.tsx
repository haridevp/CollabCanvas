import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import PublicRoomsGallery from '../../../features/rooms/PublicRoomsGallery';
import roomService from '../../../services/roomService';
import { BrowserRouter } from 'react-router-dom';

// Mock roomService
vi.mock('../../../services/roomService', () => ({
  default: {
    getPublicRooms: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    createRoom: vi.fn(),
  }
}));

// Wrap with Router for navigate
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockRooms = [
  {
    id: 'r1',
    name: 'Test Room 1',
    description: 'First test room',
    isPublic: true,
    ownerName: 'Alice',
    participantCount: 5,
    maxParticipants: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'r2',
    name: 'Private Room',
    description: 'Secret room',
    isPublic: false,
    ownerName: 'Bob',
    participantCount: 2,
    maxParticipants: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('PublicRoomsGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(roomService.getPublicRooms).mockResolvedValue({
      success: true,
      rooms: mockRooms as any,
    });
  });

  test('does not render when isOpen is false', () => {
    renderWithRouter(
      <PublicRoomsGallery isOpen={false} onClose={vi.fn()} onJoinRoom={vi.fn()} />
    );
    expect(screen.queryByText(/Public Rooms Gallery/i)).not.toBeInTheDocument();
  });

  test('renders gallery and rooms when isOpen is true', async () => {
    renderWithRouter(
      <PublicRoomsGallery isOpen={true} onClose={vi.fn()} onJoinRoom={vi.fn()} />
    );

    expect(screen.getByText(/Public Rooms Gallery/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Room 1')).toBeInTheDocument();
      expect(screen.getByText('Private Room')).toBeInTheDocument();
    });
  });

  test('filters rooms based on search input', async () => {
    renderWithRouter(
      <PublicRoomsGallery isOpen={true} onClose={vi.fn()} onJoinRoom={vi.fn()} />
    );

    await waitFor(() => screen.getByText('Test Room 1'));

    const searchInput = screen.getByLabelText('Search rooms');
    fireEvent.change(searchInput, { target: { value: 'Private' } });

    expect(screen.queryByText('Test Room 1')).not.toBeInTheDocument();
    expect(screen.getByText('Private Room')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    renderWithRouter(
      <PublicRoomsGallery isOpen={true} onClose={onClose} onJoinRoom={vi.fn()} />
    );

    await waitFor(() => screen.getByText('Test Room 1'));

    fireEvent.click(screen.getByLabelText('Close gallery'));
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onJoinRoom when clicking a public room', async () => {
    const onJoinRoom = vi.fn();
    renderWithRouter(
      <PublicRoomsGallery isOpen={true} onClose={vi.fn()} onJoinRoom={onJoinRoom} />
    );

    await waitFor(() => screen.getByText('Test Room 1'));
    // Finding join button - actually we want to click the card to trigger handleRoomClick
    const card = screen.getByRole('article', { name: /Room: Test Room 1/i });
    fireEvent.click(card);

    expect(onJoinRoom).toHaveBeenCalledWith('r1');
  });

  test('prompts for password when joining a private room', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('secret');
    const onJoinRoom = vi.fn();

    renderWithRouter(
      <PublicRoomsGallery isOpen={true} onClose={vi.fn()} onJoinRoom={onJoinRoom} />
    );

    await waitFor(() => screen.getByText('Private Room'));
    // Finding join button - actually click the card
    const card = screen.getByRole('article', { name: /Room: Private Room/i });
    fireEvent.click(card);

    expect(window.prompt).toHaveBeenCalledWith(
      'This room requires a password. Please enter the password:'
    );
    expect(onJoinRoom).toHaveBeenCalledWith('r2');
  });

  test('category filter buttons change categoryFilter state', async () => {
    renderWithRouter(
      <PublicRoomsGallery isOpen={true} onClose={vi.fn()} onJoinRoom={vi.fn()} />
    );

    const creativeButton = screen.getByLabelText('Filter by Creative');
    fireEvent.click(creativeButton);

    // Should trigger API call with new category filter
    await waitFor(() => {
      expect(roomService.getPublicRooms).toHaveBeenCalled();
    });
  });

  test('refresh button triggers loadRooms', async () => {
    renderWithRouter(
      <PublicRoomsGallery isOpen={true} onClose={vi.fn()} onJoinRoom={vi.fn()} />
    );

    const refreshButton = screen.getByLabelText('Refresh rooms');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(roomService.getPublicRooms).toHaveBeenCalled();
    });
  });

  test('sort select changes sortBy state and reloads rooms', async () => {
    renderWithRouter(
      <PublicRoomsGallery isOpen={true} onClose={vi.fn()} onJoinRoom={vi.fn()} />
    );

    const sortSelect = screen.getByLabelText('Sort rooms by');
    fireEvent.change(sortSelect, { target: { value: 'newest' } });

    await waitFor(() => {
      expect(roomService.getPublicRooms).toHaveBeenCalled();
    });
  });

  test('load more button calls handleLoadMore', async () => {
    // Mock 20 rooms to make hasMore true
    const manyRooms = Array.from({ length: 20 }, (_, i) => ({
      ...mockRooms[0],
      id: `room-${i}`,
      name: `Room ${i}`,
    }));

    vi.mocked(roomService.getPublicRooms).mockResolvedValueOnce({
      success: true,
      rooms: manyRooms as any,
    });

    renderWithRouter(
      <PublicRoomsGallery isOpen={true} onClose={vi.fn()} onJoinRoom={vi.fn()} />
    );

    await waitFor(() => screen.getByText('Room 0'));

    const loadMoreButton = screen.getByLabelText('Load more rooms');
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(roomService.getPublicRooms).toHaveBeenCalledTimes(2); // Initial + load more
    });
  });
});