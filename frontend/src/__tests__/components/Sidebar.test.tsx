import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Sidebar } from '../../components/Sidebar';
import api from '../../api/axios';
import { performLogout } from '../../utils/logoutHandler';
import { useAuth } from '../../services/AuthContext';

// ---- mocks ----
vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../utils/logoutHandler', () => ({
  performLogout: vi.fn(),
}));

vi.mock('../../services/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../components/ui/NotificationCenter', () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

vi.mock('../../components/ui/Modal', () => ({
  Modal: ({ isOpen, title, children }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h1>{title}</h1>
        {children}
      </div>
    ) : null,
}));

vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, isLoading, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}));

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };
const mockedPerformLogout = performLogout as ReturnType<typeof vi.fn>;
const mockedUseAuth = useAuth as ReturnType<typeof vi.fn>;

// react-router-dom navigate mock
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

describe('Sidebar', () => {
  const baseUser = {
    id: 'u1',
    fullName: 'Sidharth',
    displayName: 'Sid',
    email: 'sid@test.com',
    avatar: '',
  };

  const renderSidebar = () =>
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'alert').mockImplementation(() => { });
    // default auth
    mockedUseAuth.mockReturnValue({
      user: baseUser,
      updateUser: jest.fn(),
    });
  });

  afterEach(() => {
    (window.alert as jest.Mock).mockRestore();
  });

  it('renders brand + nav items', () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: false } });

    renderSidebar();

    expect(screen.getByText('CollabCanvas')).toBeInTheDocument();
    expect(screen.getByLabelText(/navigate to dashboard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/navigate to profile/i)).toBeInTheDocument();
    expect(screen.getByTestId('notification-center')).toBeInTheDocument();
  });

  it('renders user info from auth context initially', () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: false } });

    renderSidebar();

    expect(screen.getByText('Sidharth')).toBeInTheDocument();
    expect(screen.getByText('sid@test.com')).toBeInTheDocument();
  });

  it('fetches user profile on mount and updates UI when API returns success', async () => {
    const updateUser = jest.fn();

    mockedUseAuth.mockReturnValue({
      user: baseUser,
      updateUser,
    });

    mockedApi.get.mockResolvedValueOnce({
      data: {
        success: true,
        user: {
          ...baseUser,
          fullName: 'Updated Name',
          email: 'updated@test.com',
        },
      },
    });

    renderSidebar();

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/auth/profile');
    });

    expect(await screen.findByText('Updated Name')).toBeInTheDocument();
    expect(await screen.findByText('updated@test.com')).toBeInTheDocument();

    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Updated Name',
        email: 'updated@test.com',
      })
    );
  });

  it('does NOT fetch profile if user.id is missing', async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      updateUser: jest.fn(),
    });

    renderSidebar();

    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('opens logout confirmation modal when Sign Out is clicked', () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: false } });

    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: /sign out of your account/i }));

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText(/confirm sign out/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel sign out/i })).toBeInTheDocument();
  });

  it('closes logout modal when Cancel is clicked', () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: false } });

    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: /sign out of your account/i }));
    expect(screen.getByTestId('modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel sign out/i }));
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('calls performLogout and navigates to /login when confirming sign out', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: false } });
    mockedPerformLogout.mockResolvedValueOnce(undefined);

    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: /sign out of your account/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm sign out/i }));

    await waitFor(() => {
      expect(mockedPerformLogout).toHaveBeenCalledTimes(1);
    });

    expect(mockedPerformLogout).toHaveBeenCalledWith({
      showConfirmation: false,
      showSuccess: true,
      redirectTo: '/CollabCanvas/login',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/CollabCanvas/login');
  });

  it('shows alert if sign out fails', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: false } });
    mockedPerformLogout.mockRejectedValueOnce(new Error('logout failed'));

    renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: /sign out of your account/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm sign out/i }));

    await waitFor(() => {
      expect(mockedPerformLogout).toHaveBeenCalledTimes(1);
    });

    expect(window.alert).toHaveBeenCalledWith('Failed to sign out. Please try again.');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders version footer', () => {
    mockedApi.get.mockResolvedValueOnce({ data: { success: false } });

    renderSidebar();

    expect(screen.getByText(/v1\.0\.0/i)).toBeInTheDocument();
  });
});
