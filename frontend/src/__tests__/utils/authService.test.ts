import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  registerUser,
  loginWithEmailPassword,
  checkUsernameAvailability,
  updateProfile,
  verifyEmailToken,
  getDeviceType,
  forgotPassword,
  resetPassword,
  searchUsers,
  inviteUsersToRoom,
  exportDrawing,
  clearAuthTokens
} from '../../utils/authService';

// IMPORTANT: Mock axios instance used in utils/authService.ts
vi.mock('../../api/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn()
  }
}));

import api from '../../api/axios';

describe('utils/authService.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUser()', () => {
    test('should call api.post and return response.data', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, userId: '123' }
      });

      const result = await registerUser({ email: 'a@b.com' });

      expect(api.post).toHaveBeenCalledWith('/auth/register', { email: 'a@b.com' });
      expect(result).toEqual({ success: true, userId: '123' });
    });
  });

  describe('loginWithEmailPassword()', () => {
    test('should call api.post with merged credentials + activityData', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, token: 'abc' }
      });

      const result = await loginWithEmailPassword(
        { email: 'user@example.com', password: 'pass' },
        { deviceType: 'Desktop' }
      );

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'user@example.com',
        password: 'pass',
        activityData: { deviceType: 'Desktop' }
      });

      expect(result).toEqual({ success: true, token: 'abc' });
    });
  });

  describe('checkUsernameAvailability()', () => {
    test('should call api.get and return response.data', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { available: true }
      });

      const result = await checkUsernameAvailability('sid');

      expect(api.get).toHaveBeenCalledWith('/auth/check-username/sid');
      expect(result).toEqual({ available: true });
    });
  });

  describe('updateProfile()', () => {
    test('should return response.data on success', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: { success: true, message: 'Updated' }
      });

      const result = await updateProfile({ displayName: 'Sid' });

      expect(api.put).toHaveBeenCalledWith('/auth/update-profile', { displayName: 'Sid' });
      expect(result).toEqual({ success: true, message: 'Updated' });
    });

    test('should return formatted error response on failure', async () => {
      vi.mocked(api.put).mockRejectedValueOnce({
        response: { data: { message: 'Bad Request' } }
      });

      const result = await updateProfile({ displayName: 'Sid' });

      expect(result).toEqual({ success: false, message: 'Bad Request' });
    });

    test('should return default message if error has no response.data.message', async () => {
      vi.mocked(api.put).mockRejectedValueOnce(new Error('Network'));

      const result = await updateProfile({ displayName: 'Sid' });

      expect(result).toEqual({ success: false, message: 'Update failed' });
    });
  });

  describe('verifyEmailToken()', () => {
    test('should return response.data on success', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true }
      });

      const result = await verifyEmailToken('token123');

      expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'token123' });
      expect(result).toEqual({ success: true });
    });

    test('should return error.response.data on failure', async () => {
      vi.mocked(api.post).mockRejectedValueOnce({
        response: { data: { success: false, message: 'Invalid token' } }
      });

      const result = await verifyEmailToken('bad');

      expect(result).toEqual({ success: false, message: 'Invalid token' });
    });

    test('should return default error if no response data exists', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Network'));

      const result = await verifyEmailToken('bad');

      expect(result).toEqual({ success: false, message: 'Verification failed' });
    });
  });

  describe('getDeviceType()', () => {
    const originalUA = navigator.userAgent;

    afterEach(() => {
      // restore
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUA,
        configurable: true
      });
    });

    test('should return Mobile for mobile userAgent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        configurable: true
      });

      expect(getDeviceType()).toBe('Mobile');
    });

    test('should return Tablet for tablet userAgent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
        configurable: true
      });

      expect(getDeviceType()).toBe('Tablet');
    });

    test('should return Desktop for other userAgents', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true
      });

      expect(getDeviceType()).toBe('Desktop');
    });
  });

  describe('forgotPassword()', () => {
    test('should call api.post and return response.data', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true }
      });

      const result = await forgotPassword('user@example.com');

      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'user@example.com'
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('resetPassword()', () => {
    test('should call api.post and return response.data', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true }
      });

      const result = await resetPassword('token123', 'newpass');

      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'token123',
        password: 'newpass'
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe('searchUsers()', () => {
    test('should return response.data on success', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { success: true, users: [{ id: 1 }] }
      });

      const result = await searchUsers('john');

      expect(api.get).toHaveBeenCalledWith('/auth/search?q=john');
      expect(result).toEqual({ success: true, users: [{ id: 1 }] });
    });

    test('should return fallback object on failure', async () => {
      vi.mocked(api.get).mockRejectedValueOnce({
        response: { data: { message: 'Nope' } }
      });

      const result = await searchUsers('john');

      expect(result).toEqual({
        success: false,
        message: 'Nope',
        users: []
      });
    });
  });

  describe('inviteUsersToRoom()', () => {
    test('should return response.data on success', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { success: true, results: { sent: 2 } }
      });

      const result = await inviteUsersToRoom('room-1', ['u1', 'u2']);

      expect(api.post).toHaveBeenCalledWith('/rooms/room-1/invite', {
        userIds: ['u1', 'u2']
      });

      expect(result).toEqual({ success: true, results: { sent: 2 } });
    });

    test('should return fallback object on failure', async () => {
      vi.mocked(api.post).mockRejectedValueOnce({
        response: { data: { message: 'Fail' } }
      });

      const result = await inviteUsersToRoom('room-1', ['u1']);

      expect(result).toEqual({
        success: false,
        message: 'Fail',
        results: { sent: 0, skipped: 0, errors: [] }
      });
    });
  });

  describe('exportDrawing()', () => {
    test('should return blob response.data on success', async () => {
      const mockBlob = new Blob(['hello'], { type: 'image/png' });

      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockBlob
      });

      const result = await exportDrawing('room-1', 'png');

      expect(api.get).toHaveBeenCalledWith('/rooms/room-1/export?format=png', {
        responseType: 'blob'
      });

      expect(result).toBe(mockBlob);
    });

    test('should throw Error with backend message if export fails', async () => {
      vi.mocked(api.get).mockRejectedValueOnce({
        response: { data: { message: 'Export denied' } }
      });

      await expect(exportDrawing('room-1', 'png')).rejects.toThrow('Export denied');
    });

    test('should throw Error with default message if export fails without backend message', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network'));

      await expect(exportDrawing('room-1', 'png')).rejects.toThrow(
        'Failed to export drawing'
      );
    });
  });

  describe('clearAuthTokens()', () => {
    test('should clear auth keys but preserve user-theme', () => {
      localStorage.setItem('user-theme', 'dark');
      localStorage.setItem('auth_token', 'token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      localStorage.setItem('login_activities', '[]');
      localStorage.setItem('remembered_email', 'user@example.com');

      // Add something in session storage too
      sessionStorage.setItem('something', 'value');

      clearAuthTokens();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('login_activities')).toBeNull();
      expect(localStorage.getItem('remembered_email')).toBeNull();

      // Theme should still exist
      expect(localStorage.getItem('user-theme')).toBe('dark');

      // Session storage should be cleared
      expect(sessionStorage.getItem('something')).toBeNull();

      expect(console.log).toHaveBeenCalledWith('Auth tokens cleared successfully');
    });

    test('should not set user-theme back if it was not present', () => {
      localStorage.removeItem('user-theme');
      localStorage.setItem('auth_token', 'token');

      clearAuthTokens();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('user-theme')).toBeNull();
    });
  });
});
