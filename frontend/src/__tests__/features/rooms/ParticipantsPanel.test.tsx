import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ParticipantsPanel from '../../../features/rooms/ParticipantsPanel';
import roomService from '../../../services/roomService';

// Mock roomService
vi.mock('../../../services/roomService', () => ({
  default: {
    getParticipants: vi.fn(),
    manageParticipant: vi.fn(),
  }
}));

const mockParticipants = [
  {
    id: '1',
    userId: 'u1',
    username: 'Alice',
    email: 'alice@test.com',
    role: 'owner',
    joinedAt: '2026-02-01T10:00:00Z',
    lastActive: new Date().toISOString(),
  },
  {
    id: '2',
    userId: 'u2',
    username: 'Bob',
    email: 'bob@test.com',
    role: 'participant',
    joinedAt: '2026-02-01T10:05:00Z',
    lastActive: new Date().toISOString(),
  },
];

describe('ParticipantsPanel', () => {
  beforeEach(() => {
    vi.mocked(roomService.getParticipants).mockResolvedValue({
      success: true,
      participants: mockParticipants,
    });
    vi.mocked(roomService.manageParticipant).mockResolvedValue({
      success: true,
    });
  });

  test('renders participants when panel is open', async () => {
    render(
      <ParticipantsPanel
        roomId="room1"
        currentUserId="u1"
        currentUserRole="owner"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Alice/i)).toBeInTheDocument();
      expect(screen.getByText(/Bob/i)).toBeInTheDocument();
    });
  });

  test('search filters participants', async () => {
    render(
      <ParticipantsPanel
        roomId="room1"
        currentUserId="u1"
        currentUserRole="owner"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => screen.getByText(/Alice/i));

    const searchInput = screen.getByPlaceholderText('Search participants...');
    fireEvent.change(searchInput, { target: { value: 'Bob' } });

    expect(screen.queryByText(/Alice/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
  });

  test('opens action menu when more button is clicked', async () => {
    render(
      <ParticipantsPanel
        roomId="room1"
        currentUserId="u1"
        currentUserRole="owner"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => screen.getByText(/Bob/i));
    const manageButtons = screen.getAllByLabelText(/Manage/);
    fireEvent.click(manageButtons[0]);

    expect(screen.getByText(/Manage Bob/i)).toBeInTheDocument();
  });

  test('promotes participant to moderator', async () => {
    render(
      <ParticipantsPanel
        roomId="room1"
        currentUserId="u1"
        currentUserRole="owner"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => screen.getByText(/Bob/i));
    const manageButton = screen.getAllByLabelText(/Manage/)[0];
    fireEvent.click(manageButton);

    const promoteButton = screen.getByText(/Promote to Moderator/);
    fireEvent.click(promoteButton);

    await waitFor(() => {
      expect(roomService.manageParticipant).toHaveBeenCalledWith(
        'room1',
        'u2',
        'promote'
      );
    });
  });

  test('opens confirmation dialog for kick action', async () => {
    render(
      <ParticipantsPanel
        roomId="room1"
        currentUserId="u1"
        currentUserRole="owner"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => screen.getByText(/Bob/i));
    const manageButton = screen.getAllByLabelText(/Manage/)[0];
    fireEvent.click(manageButton);

    const kickButton = screen.getByText(/Kick from Room/);
    fireEvent.click(kickButton);

    expect(screen.getByText(/Kick Participant?/)).toBeInTheDocument();

    const confirmButton = screen.getByText(/^Kick$/);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(roomService.manageParticipant).toHaveBeenCalledWith(
        'room1',
        'u2',
        'kick'
      );
    });
  });

  test('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();

    render(
      <ParticipantsPanel
        roomId="room1"
        currentUserId="u1"
        currentUserRole="owner"
        isOpen={true}
        onClose={handleClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Close participants panel'));
    expect(handleClose).toHaveBeenCalled();
  });
});