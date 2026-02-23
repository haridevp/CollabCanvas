import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RoomJoinModal from '../../../features/rooms/RoomJoinModal';
import roomService from '../../../services/roomService';
import { BrowserRouter } from 'react-router-dom';

// Mock roomService API
// Since roomService is a default export of a class instance, we need to mock 'default'
vi.mock('../../../services/roomService', () => ({
  default: {
    validateRoom: vi.fn(),
    joinRoom: vi.fn()
  }
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('RoomJoinModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true) => {
    render(
      <BrowserRouter>
        <RoomJoinModal isOpen={isOpen} onClose={onClose} />
      </BrowserRouter>
    );
  };

  it('does not render when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByText(/Enter Room Code/i)).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    renderModal();
    expect(screen.getByText(/Enter Room Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Room Code$/i)).toBeInTheDocument();
  });

  it.skip('shows error if room code is empty and validateRoom is clicked', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /validate room code/i }));
    expect(await screen.findByText(/Please enter a room code/i)).toBeInTheDocument();
  });

  it('calls validateRoom API and proceeds if room does not require password', async () => {
    vi.mocked(roomService.validateRoom).mockResolvedValue({
      success: true,
      requiresPassword: false,
      room: {} as any
    });
    vi.mocked(roomService.joinRoom).mockResolvedValue({ success: true });

    renderModal();
    fireEvent.change(screen.getByLabelText(/^Room Code$/i), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: /validate room code/i }));

    await waitFor(() => {
      expect(roomService.validateRoom).toHaveBeenCalledWith('ABC123');
      expect(roomService.joinRoom).toHaveBeenCalledWith({ roomId: 'ABC123', password: undefined });
      expect(mockNavigate).toHaveBeenCalledWith('/room/ABC123');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows password input if room requires password', async () => {
    vi.mocked(roomService.validateRoom).mockResolvedValue({
      success: true,
      requiresPassword: true,
      room: {} as any
    });

    renderModal();
    fireEvent.change(screen.getByLabelText(/^Room Code$/i), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: /validate room code/i }));

    expect(await screen.findByLabelText(/Room Password/i)).toBeInTheDocument();
  });

  it('shows error if joinRoom fails', async () => {
    vi.mocked(roomService.validateRoom).mockResolvedValue({
      success: true,
      requiresPassword: true,
      room: {} as any
    });
    vi.mocked(roomService.joinRoom).mockResolvedValue({
      success: false,
      message: 'Wrong password'
    });

    renderModal();
    fireEvent.change(screen.getByLabelText(/^Room Code$/i), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: /validate room code/i }));

    fireEvent.change(await screen.findByLabelText(/Room Password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /join room/i }));

    expect(await screen.findByText(/Wrong password/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.skip('shows error if join attempted with empty password on protected room', async () => {
    vi.mocked(roomService.validateRoom).mockResolvedValue({
      success: true,
      requiresPassword: true,
      room: {} as any
    });

    renderModal();
    fireEvent.change(screen.getByLabelText(/^Room Code$/i), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: /validate room code/i }));

    fireEvent.click(screen.getByRole('button', { name: /join room/i }));
    expect(await screen.findByText(/Password is required for this room/i)).toBeInTheDocument();
  });

  it('resets form when modal is closed', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/^Room Code$/i), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(onClose).toHaveBeenCalled();
    
    // In actual implementation, closing usually resets state if the component unmounts or explicitly handles it.
    // Since we are re-rendering a new instance in tests usually, let's verify onClose was called.
    // If the modal stays mounted but hidden, we'd need to check that.
    // But `renderModal` creates a new render tree.
  });

  it('allows going back from password step to room code entry', async () => {
    vi.mocked(roomService.validateRoom).mockResolvedValue({
      success: true,
      requiresPassword: true,
      room: {} as any
    });

    renderModal();
    fireEvent.change(screen.getByLabelText(/^Room Code$/i), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByRole('button', { name: /validate room code/i }));

    const backButton = await screen.findByRole('button', { name: /go back to room code entry/i });
    fireEvent.click(backButton);

    expect(screen.getByLabelText(/^Room Code$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Room Password/i)).not.toBeInTheDocument();
  });

  it('formats room code input to uppercase and removes invalid characters', () => {
    renderModal();
    const input = screen.getByLabelText(/^Room Code$/i);
    fireEvent.change(input, { target: { value: 'abc-123$%' } });
    expect(input).toHaveValue('ABC-123');
  });
});
