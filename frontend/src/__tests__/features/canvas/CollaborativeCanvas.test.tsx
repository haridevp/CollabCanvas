import { render, screen } from '@testing-library/react';
import { CollaborativeCanvas } from '../../../features/canvas/CollaborativeCanvas';
import { AuthProvider } from '../services/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../../services/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', username: 'testuser' }
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    off: vi.fn(),
  })
}));

describe('CollaborativeCanvas', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <CollaborativeCanvas roomId="test-room" />
      </BrowserRouter>
    );
    
    // Check if toolbar is rendered
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    // Check if canvas is rendered
    expect(screen.getByLabelText(/Collaborative drawing canvas/i)).toBeInTheDocument();
  });

  it('shows toolbar buttons', () => {
    render(
      <BrowserRouter>
        <CollaborativeCanvas roomId="test-room" />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/Pencil tool/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rectangle tool/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Circle tool/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Eraser tool/i)).toBeInTheDocument();
  });
});
