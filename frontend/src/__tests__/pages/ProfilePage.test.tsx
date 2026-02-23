// src/__tests__/pages/ProfilePage.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import ProfilePage from '../../pages/ProfilePage';
import { updateProfile } from '../../utils/authService';
import { useAuth } from '../../services/AuthContext';
import {
  hasPendingDeletion,
  getPendingDeletion,
  requestAccountDeletion,
} from '../../services/accountDeletionService';

// ============ MOCKS ============

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

vi.mock('../../components/ui/ThemeSelector', () => ({
  __esModule: true,
  default: ({ currentTheme, onThemeChange }: any) => (
    <div data-testid="theme-selector">
      <span>ThemeSelector: {currentTheme}</span>
      <button onClick={() => onThemeChange('dark')}>Set Dark</button>
      <button onClick={() => onThemeChange('light')}>Set Light</button>
      <button onClick={() => onThemeChange('system')}>Set System</button>
      <button onClick={() => onThemeChange('high-contrast')}>Set High Contrast</button>
    </div>
  ),
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

vi.mock('../../components/DeletionSurveyModal', () => ({
  __esModule: true,
  default: ({ isOpen }: any) => (isOpen ? <div>Deletion Survey</div> : null),
}));

// Services
vi.mock('../../utils/authService', () => ({
  updateProfile: vi.fn(),
}));

vi.mock('../../services/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../services/accountDeletionService', () => ({
  requestAccountDeletion: vi.fn(),
  hasPendingDeletion: vi.fn(),
  getPendingDeletion: vi.fn(),
  cancelAccountDeletion: vi.fn(),
  clearUserData: vi.fn(),
}));

// ============ HELPERS ============
const mockUpdateUser = vi.fn();
const mockLogout = vi.fn();

const baseUser = {
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

    vi.mocked(hasPendingDeletion).mockReturnValue(false);
    vi.mocked(getPendingDeletion).mockReturnValue(null);

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

  test('renders base layout and personal tab by default', () => {
    render(<ProfilePage />);

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();

    // Tabs
    expect(screen.getByRole('button', { name: /Personal Info/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Appearance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keyboard Shortcuts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Security/i })).toBeInTheDocument();

    // Personal tab content
    expect(screen.getByText(/Upload a new profile picture/i)).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    expect(screen.getByTestId('character-counter')).toBeInTheDocument();
  });

  test('switches tabs: appearance tab shows ThemeSelector', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Appearance/i }));
    expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
  });

  test('switches tabs: notifications tab shows enable/disable all', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    expect(screen.getByRole('button', { name: /Enable All/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Disable All/i })).toBeInTheDocument();
  });

  test('switches tabs: shortcuts tab renders shortcut inputs', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Keyboard Shortcuts/i }));

    expect(screen.getByText(/Keyboard Shortcuts Customization/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ctrl+Z')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ctrl+Y')).toBeInTheDocument();
    expect(screen.getByDisplayValue('B')).toBeInTheDocument();
  });

  test('switches tabs: security tab shows danger zone', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Security/i }));

    expect(screen.getByText(/Danger Zone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Account Permanently/i })).toBeInTheDocument();
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

  test('theme change: clicking quick toggle applies theme classes and updates user + localStorage', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Appearance/i }));

    // Click quick theme toggle button "Dark"
    fireEvent.click(screen.getByRole('button', { name: /Dark/i }));

    expect(mockUpdateUser).toHaveBeenCalledWith({ theme: 'dark' });
    expect(localStorage.getItem('user-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('theme change: system theme uses matchMedia (dark matches -> adds dark)', () => {
    (window.matchMedia as any).mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Appearance/i }));

    // Click System
    fireEvent.click(screen.getByRole('button', { name: /System/i }));

    expect(mockUpdateUser).toHaveBeenCalledWith({ theme: 'system' });
    expect(localStorage.getItem('user-theme')).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('theme change: high-contrast adds both high-contrast and dark classes', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Appearance/i }));

    // Use ThemeSelector mock button
    fireEvent.click(screen.getByRole('button', { name: /Set High Contrast/i }));

    expect(mockUpdateUser).toHaveBeenCalledWith({ theme: 'high-contrast' });
    expect(localStorage.getItem('user-theme')).toBe('high-contrast');

    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
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

  test('notifications: enable all turns on all toggles', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));

    // Disable all first
    fireEvent.click(screen.getByRole('button', { name: /Disable All/i }));

    const emailToggle = screen.getByLabelText(/Email Notifications/i, { selector: 'label' });
    expect(emailToggle).toBeInTheDocument();

    // Enable all
    fireEvent.click(screen.getByRole('button', { name: /Enable All/i }));

    // checkboxes are sr-only inputs, easiest check: find by id
    const emailInput = document.getElementById('email-notifications') as HTMLInputElement;
    const pushInput = document.getElementById('in-app-notifications') as HTMLInputElement;
    const desktopInput = document.getElementById('desktop-notifications') as HTMLInputElement;
    const soundInput = document.getElementById('sound-notifications') as HTMLInputElement;

    expect(emailInput.checked).toBe(true);
    expect(pushInput.checked).toBe(true);
    expect(desktopInput.checked).toBe(true);
    expect(soundInput.checked).toBe(true);
  });

  test('shortcuts: entering duplicate shortcut shows conflict warning', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Keyboard Shortcuts/i }));

    // Change redo to Ctrl+Z (conflicts with undo)
    const redoInput = screen.getByDisplayValue('Ctrl+Y');
    fireEvent.change(redoInput, { target: { value: 'Ctrl+Z' } });

    expect(screen.getByText(/Conflict with undo/i)).toBeInTheDocument();
  });

  test('shortcuts: reset button restores defaults and clears conflict', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Keyboard Shortcuts/i }));

    // Make a conflict first
    fireEvent.change(screen.getByDisplayValue('Ctrl+Y'), { target: { value: 'Ctrl+Z' } });
    expect(screen.getByText(/Conflict with undo/i)).toBeInTheDocument();

    // Reset
    fireEvent.click(screen.getByRole('button', { name: /Reset to Defaults/i }));

    expect(screen.queryByText(/Conflict with/i)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Ctrl+Y')).toBeInTheDocument();
  });

  test('security: clicking delete account permanently shows confirm UI', () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Security/i }));

    fireEvent.click(screen.getByRole('button', { name: /Delete Account Permanently/i }));

    expect(screen.getByText(/Confirm Account Deletion/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Current password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type DELETE here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Yes, Delete My Account/i })).toBeInTheDocument();
  });

  test('security: delete account requires password and DELETE text', async () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Security/i }));
    fireEvent.click(screen.getByRole('button', { name: /Delete Account Permanently/i }));

    fireEvent.click(screen.getByRole('button', { name: /Yes, Delete My Account/i }));

    expect(window.alert).toHaveBeenCalledWith('Please enter your password');
    expect(requestAccountDeletion).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/Current password/i), {
      target: { value: 'pass123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Yes, Delete My Account/i }));

    expect(window.alert).toHaveBeenCalledWith('Please type "DELETE"');
    expect(requestAccountDeletion).not.toHaveBeenCalled();
  });

  test('security: successful delete calls requestAccountDeletion and redirects', async () => {
    vi.mocked(requestAccountDeletion).mockResolvedValueOnce({ success: true });

    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: /Security/i }));
    fireEvent.click(screen.getByRole('button', { name: /Delete Account Permanently/i }));

    fireEvent.change(screen.getByPlaceholderText(/Current password/i), {
      target: { value: 'pass123' },
    });

    fireEvent.change(screen.getByPlaceholderText(/Type DELETE here/i), {
      target: { value: 'DELETE' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Yes, Delete My Account/i }));

    await waitFor(() => {
      expect(requestAccountDeletion).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'pass123',
      });
    });

    expect(window.alert).toHaveBeenCalledWith('Account deleted.');
    expect(window.location.href).toBe('/login');
  });
});