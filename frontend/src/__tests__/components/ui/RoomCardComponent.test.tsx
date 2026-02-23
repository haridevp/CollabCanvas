import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect } from 'vitest';
import RoomCardComponent, { RoomCard } from '../../../components/ui/RoomCardComponent';

// Mock Button so we don't depend on its internal styling/logic
vi.mock('../Button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  )
}));

const baseProps = {
  id: 'room-123',
  name: 'Design Room',
  description: 'This is a test room',
  isPublic: true,
  ownerName: 'Alex',
  participantCount: 5,
  maxParticipants: 20,
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T14:45:00Z',
  thumbnail: undefined
};

const renderRoomCard = (props = {}) => {
  return render(
    <MemoryRouter>
      <RoomCardComponent {...baseProps} {...props} />
    </MemoryRouter>
  );
};

describe('RoomCard', () => {
  test('renders room name and description', () => {
    renderRoomCard();

    expect(screen.getByText('Design Room')).toBeInTheDocument();
    expect(screen.getByLabelText('Room description')).toHaveTextContent(
      'This is a test room'
    );
  });

  test('does not render description when not provided', () => {
    renderRoomCard({ description: undefined });

    expect(screen.queryByLabelText('Room description')).not.toBeInTheDocument();
  });

  test('shows participant count correctly', () => {
    renderRoomCard({ participantCount: 7, maxParticipants: 10 });

    expect(
      screen.getByLabelText('7 of 10 participants')
    ).toBeInTheDocument();

    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  test('shows public room indicator when isPublic=true', () => {
    renderRoomCard({ isPublic: true });

    // The icon wrapper has aria-label "Public room"
    expect(screen.getAllByLabelText('Public room').length).toBeGreaterThan(0);

    // Should NOT show private badge
    expect(screen.queryByText('Private')).not.toBeInTheDocument();
  });

  test('shows private room badge and indicator when isPublic=false', () => {
    renderRoomCard({ isPublic: false });

    expect(screen.getAllByLabelText('Private room').length).toBeGreaterThan(0);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  test('renders owner info when showOwnerInfo=true (default)', () => {
    renderRoomCard();

    expect(screen.getByText('Created by Alex')).toBeInTheDocument();
  });

  test('does not render owner info when showOwnerInfo=false', () => {
    renderRoomCard({ showOwnerInfo: false });

    expect(screen.queryByText(/Created by/i)).not.toBeInTheDocument();
  });

  test('renders "Enter Room" button when showJoinButton=true (default)', () => {
    renderRoomCard();

    expect(
      screen.getByRole('link', { name: /Enter room: Design Room/i })
    ).toHaveAttribute('href', '/room/room-123');

    expect(screen.getByRole('button', { name: /Enter Room/i })).toBeInTheDocument();
  });

  test('renders "Open" button when showJoinButton=false', () => {
    renderRoomCard({ showJoinButton: false });

    expect(
      screen.getByRole('link', { name: /Open room: Design Room/i })
    ).toHaveAttribute('href', '/room/room-123');

    expect(screen.getByRole('button', { name: /Open/i })).toBeInTheDocument();
  });

  test('calls onClick when clicking the card', () => {
    const onClick = vi.fn();
    renderRoomCard({ onClick });

    const card = screen.getByRole('article', { name: 'Room: Design Room' });
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('does NOT call onClick when clicking the link (stopPropagation)', () => {
    const onClick = vi.fn();
    renderRoomCard({ onClick });

    const link = screen.getByRole('link', { name: /Enter room: Design Room/i });
    fireEvent.click(link);

    expect(onClick).not.toHaveBeenCalled();
  });

  test('uses thumbnail background if thumbnail is provided', () => {
    const { container } = renderRoomCard({
      thumbnail: 'https://example.com/thumb.png'
    });

    // The header is the first div with class h-40 relative
    const header = container.querySelector('.h-40.relative') as HTMLDivElement;

    expect(header).toBeTruthy();
    expect(header).toHaveStyle({
      background: 'url(https://example.com/thumb.png) center/cover no-repeat'
    });
  });

  test('uses gradient background if thumbnail is NOT provided', () => {
    const { container } = renderRoomCard({ thumbnail: undefined });

    const header = container.querySelector('.h-40.relative') as HTMLDivElement;

    expect(header).toBeTruthy();
    expect(header).toHaveStyle({
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'
    });
  });

  test('exports work: default export and named export', () => {
    expect(RoomCardComponent).toBeDefined();
    expect(RoomCard).toBeDefined();
  });
});
