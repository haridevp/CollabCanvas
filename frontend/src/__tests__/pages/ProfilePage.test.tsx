// src/__tests__/pages/ProfilePage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ProfilePage from '../../pages/ProfilePage';
import { updateProfile } from '../../utils/authService';
import { useAuth } from '../../services/AuthContext';

// ============ MOCKS ============
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Sidebar
vi.mock('../../components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

// UI Components
vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, isLoading, className, variant }: any) => (
    <button
      onClick={onClick}
      data-variant={variant || 'default'}
      data-loading={isLoading ? 'true' : 'false'}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('../../components/ui/Modal', () => ({
  Modal: ({ isOpen, title, children }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock('../../components/ui/CharacterCounter', () => ({
  __esModule: true,
  default: ({ currentLength, maxLength }: any) => (
    <div data-testid="character-counter">
      {currentLength}/{maxLength}
    </div>
  ),
}));

vi.mock('../../components/ui/FileUpload', () => ({
  __esModule: true,
  default: ({ onFileSelect }: any) => (
    <div data-testid="file-upload">
      <button onClick={() => onFileSelect(new File(['x'], 'avatar.png', { type: 'image/png' }))}>
        Mock Upload
      </button>
      <button onClick={() => onFileSelect(null)}>Clear</button>
    </div>
  ),
}));

vi.mock('../../components/ui/ImageCropper', () => ({
  __esModule: true,
  default: ({ onCropComplete, onCancel }: any) => (
    <div data-testid="image-cropper">
      <button onClick={() => onCropComplete('data:image/png;base64,TEST')}>
        Crop Complete
      </button>
      <button onClick={onCancel}>Cancel Crop</button>
    </div>
  ),
}));

// Services
vi.mock('../../utils/authService', () => ({
  updateProfile: vi.fn(),
}));

vi.mock('../../services/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// ============ HELPERS ============
const mockUpdateUser = vi.fn();
const mockLogout = vi.fn();

const baseUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  bio: 'Hello bio',
  avatar: null,
  theme: 'system',
};

const setupAuthMock = (overrides?: Partial<typeof baseUser>) => {
  (useAuth as any).mockReturnValue({
    user: { ...baseUser, ...(overrides || {}) },
    updateUser: mockUpdateUser,
    logout: mockLogout,
  });
};

// ============ TESTS ============
describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    setupAuthMock();

    // Avoid crash for URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');

    // Default matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  test('renders base layout with personal info (no tab navigation)', () => {
    render(<ProfilePage />);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();

    // Personal info content is displayed directly
    expect(screen.getByText(/Upload a new profile picture/i)).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    expect(screen.getByTestId('character-counter')).toBeInTheDocument();

    // Tab buttons should NOT exist (no tab navigation)
    expect(screen.queryByRole('button', { name: /Appearance/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Notifications/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Keyboard Shortcuts/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Security/i })).not.toBeInTheDocument();
  });

  test('display name validation: too short shows error', () => {
    render(<ProfilePage />);

    const displayNameInput = screen.getByPlaceholderText(/Enter your display name/i);

    fireEvent.change(displayNameInput, { target: { value: 'ab' } });

    expect(screen.getByText(/Display name must be between 3 and 50 characters/i)).toBeInTheDocument();
  });

  test('display name validation: invalid characters shows error', () => {
    render(<ProfilePage />);

    const displayNameInput = screen.getByPlaceholderText(/Enter your display name/i);

    fireEvent.change(displayNameInput, { target: { value: 'Bad@Name' } });

    expect(screen.getByText(/Invalid characters used/i)).toBeInTheDocument();
  });

  test('bio updates and CharacterCounter updates', () => {
    render(<ProfilePage />);

    const bioTextarea = screen.getByPlaceholderText(/Share your creative journey/i);

    fireEvent.change(bioTextarea, { target: { value: 'New bio text' } });

    expect(screen.getByTestId('character-counter')).toHaveTextContent(
      `${'New bio text'.length}/500`
    );
  });

  test('upload flow: selecting file opens cropper, crop completes updates avatar', async () => {
    render(<ProfilePage />);

    // Click mock upload (calls onFileSelect with File)
    fireEvent.click(screen.getByRole('button', { name: /Mock Upload/i }));

    // Cropper should show
    expect(screen.getByTestId('image-cropper')).toBeInTheDocument();

    // Complete crop
    fireEvent.click(screen.getByRole('button', { name: /Crop Complete/i }));

    await waitFor(() => {
      // cropper removed
      expect(screen.queryByTestId('image-cropper')).not.toBeInTheDocument();
    });

    // Avatar img should now use cropped image data URL
    const avatarImg = screen.getByAltText('Avatar') as HTMLImageElement;
    expect(avatarImg.src).toContain('data:image/png;base64,TEST');
  });

  test('save changes: invalid display name prevents updateProfile call', async () => {
    render(<ProfilePage />);

    const displayNameInput = screen.getByPlaceholderText(/Enter your display name/i);
    fireEvent.change(displayNameInput, { target: { value: 'a' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(updateProfile).not.toHaveBeenCalled();
  });

  test('save changes: calls updateProfile and updates global user on success', async () => {
    vi.mocked(updateProfile).mockResolvedValueOnce({
      success: true,
      user: { ...baseUser, fullName: 'New Name' },
      message: 'ok',
    });

    render(<ProfilePage />);

    const displayNameInput = screen.getByPlaceholderText(/Enter your display name/i);
    fireEvent.change(displayNameInput, { target: { value: 'New Name' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateUser).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Profile changes saved successfully!');
  });

  test('save changes: shows message when updateProfile returns success=false', async () => {
    vi.mocked(updateProfile).mockResolvedValueOnce({
      success: false,
      message: 'Bad request',
    });

    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledTimes(1);
    });

    expect(window.alert).toHaveBeenCalledWith('Bad request');
  });

  test('save changes: shows fallback error on thrown error', async () => {
    vi.mocked(updateProfile).mockRejectedValueOnce(new Error('Network'));

    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledTimes(1);
    });

    expect(window.alert).toHaveBeenCalledWith('An error occurred while saving.');
  });
});