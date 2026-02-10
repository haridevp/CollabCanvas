import api from '../api/axios';

/**
 * Authentication Service
 * 
 * Service functions for handling user authentication, registration,
 * profile management, and related operations.
 * 
 * @module AuthService
 */

/**
 * Registers a new user with the application
 * 
 * @async
 * @function registerUser
 * @param {any} userData - User registration data including email, password, username, etc.
 * @returns {Promise<any>} Response data from the registration API
 * 
 * @example
 * ```typescript
 * const result = await registerUser({
 *   email: 'user@example.com',
 *   password: 'securepassword123',
 *   username: 'artist123'
 * });
 * 
 * if (result.success) {
 *   console.log('Registration successful');
 * }
 * ```
 */
export const registerUser = async (userData: any) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

/**
 * Authenticates a user with email and password credentials
 * 
 * @async
 * @function loginWithEmailPassword
 * @param {any} credentials - Login credentials containing email and password
 * @param {any} activityData - Additional activity tracking data (device info, location, etc.)
 * @returns {Promise<any>} Response data containing authentication token and user info
 * 
 * @example
 * ```typescript
 * const result = await loginWithEmailPassword(
 *   { email: 'user@example.com', password: 'password123' },
 *   { deviceType: 'Desktop', location: 'New York' }
 * );
 * 
 * if (result.success) {
 *   localStorage.setItem('auth_token', result.token);
 * }
 * ```
 */
export const loginWithEmailPassword = async (credentials: any, activityData: any) => {
  const response = await api.post('/auth/login', { ...credentials, activityData });
  return response.data;
};

/**
 * Checks if a username is available for registration
 * 
 * @async
 * @function checkUsernameAvailability
 * @param {string} username - Username to check for availability
 * @returns {Promise<any>} Response indicating if username is available
 * 
 * @example
 * ```typescript
 * const result = await checkUsernameAvailability('artist123');
 * if (result.available) {
 *   console.log('Username is available');
 * } else {
 *   console.log('Username is taken');
 * }
 * ```
 */
export const checkUsernameAvailability = async (username: string) => {
  const response = await api.get(`/auth/check-username/${username}`);
  return response.data;
};

/**
 * Updates the current user's profile information
 * 
 * @async
 * @function updateProfile
 * @param {Object} profileData - Profile data to update
 * @param {string} [profileData.displayName] - New display name
 * @param {string} [profileData.bio] - New biography/description
 * @param {string | null} [profileData.avatar] - New avatar URL or null to remove
 * @returns {Promise<any>} Response indicating success or failure
 * 
 * @example
 * ```typescript
 * const result = await updateProfile({
 *   displayName: 'New Display Name',
 *   bio: 'Artist and designer',
 *   avatar: 'https://example.com/avatar.jpg'
 * });
 * ```
 */
export const updateProfile = async (profileData: { 
  displayName?: string; 
  bio?: string; 
  avatar?: string | null;
}) => {
  try {
    const response = await api.put('/auth/update-profile', profileData);
    return response.data;
  } catch (error: any) {
    return { 
      success: false, 
      message: error.response?.data?.message || "Update failed" 
    };
  }
};

/**
 * Verifies a user's email address using a verification token
 * 
 * @async
 * @function verifyEmailToken
 * @param {string} token - Email verification token sent to user's email
 * @returns {Promise<any>} Response indicating verification success or failure
 * 
 * @example
 * ```typescript
 * const result = await verifyEmailToken('verification-token-12345');
 * if (result.success) {
 *   console.log('Email verified successfully');
 * }
 * ```
 */
export const verifyEmailToken = async (token: string) => {
  try {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: "Verification failed" };
  }
};

/**
 * Detects the type of device the user is accessing from
 * 
 * @function getDeviceType
 * @returns {string} Device type: 'Mobile', 'Tablet', or 'Desktop'
 * 
 * @example
 * ```typescript
 * const device = getDeviceType();
 * console.log(`User is accessing from ${device}`);
 * ```
 */
export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
};

/**
 * Initiates a password reset process by sending a reset email
 * 
 * @async
 * @function forgotPassword
 * @param {string} email - User's email address to send reset instructions
 * @returns {Promise<any>} Response indicating if reset email was sent
 * 
 * @example
 * ```typescript
 * const result = await forgotPassword('user@example.com');
 * if (result.success) {
 *   console.log('Reset email sent successfully');
 * }
 * ```
 */
export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Completes the password reset process with a new password
 * 
 * @async
 * @function resetPassword
 * @param {string} token - Password reset token from email
 * @param {string} password - New password to set
 * @returns {Promise<any>} Response indicating if password was reset successfully
 * 
 * @example
 * ```typescript
 * const result = await resetPassword('reset-token-123', 'newSecurePassword456');
 * if (result.success) {
 *   console.log('Password reset successful');
 * }
 * ```
 */
export const resetPassword = async (token: string, password: string) => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};

/**
 * Searches for users by username, display name, or email
 * 
 * @async
 * @function searchUsers
 * @param {string} query - Search query string
 * @returns {Promise<any>} Response containing search results
 * 
 * @example
 * ```typescript
 * const result = await searchUsers('john');
 * if (result.success) {
 *   console.log('Found users:', result.users);
 * }
 * ```
 */
export const searchUsers = async (query: string) => {
  try {
    const response = await api.get(`/auth/search?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Search failed',
      users: []
    };
  }
};

/**
 * Invites users to a room by their user IDs
 * 
 * @async
 * @function inviteUsersToRoom
 * @param {string} roomId - ID of the room to invite users to
 * @param {string[]} userIds - Array of user IDs to invite
 * @returns {Promise<any>} Response indicating invitation results
 * 
 * @example
 * ```typescript
 * const result = await inviteUsersToRoom('room-123', ['user-456', 'user-789']);
 * if (result.success) {
 *   console.log(`Invites sent: ${result.results.sent}`);
 * }
 * ```
 */
export const inviteUsersToRoom = async (roomId: string, userIds: string[]) => {
  try {
    const response = await api.post(`/rooms/${roomId}/invite`, { userIds });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to send invites',
      results: { sent: 0, skipped: 0, errors: [] }
    };
  }
};

/**
 * Exports a room's drawing as an image file
 * 
 * @async
 * @function exportDrawing
 * @param {string} roomId - ID of the room containing the drawing
 * @param {'png' | 'jpeg'} [format='png'] - Image format to export as
 * @returns {Promise<Blob>} Blob containing the exported image
 * 
 * @example
 * ```typescript
 * try {
 *   const imageBlob = await exportDrawing('room-123', 'png');
 *   // Create download link
 *   const url = URL.createObjectURL(imageBlob);
 *   // Trigger download
 * } catch (error) {
 *   console.error('Export failed:', error.message);
 * }
 * ```
 */
export const exportDrawing = async (roomId: string, format: 'png' | 'jpeg' = 'png') => {
  try {
    const response = await api.get(`/rooms/${roomId}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to export drawing');
  }
};

/**
 * Clears all authentication tokens and user data from storage
 * 
 * This function preserves the user's theme preference while removing
 * all authentication-related data. Useful for logout or session cleanup.
 * 
 * @function clearAuthTokens
 * @returns {void}
 * 
 * @example
 * ```typescript
 * // Clear auth data on logout
 * clearAuthTokens();
 * // Redirect to login page
 * window.location.href = '/login';
 * ```
 */
export const clearAuthTokens = (): void => {
  // Preserve theme preference
  const theme = localStorage.getItem('user-theme');
  
  // Clear authentication data
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('login_activities');
  localStorage.removeItem('remembered_email');
  
  // Clear session storage completely
  sessionStorage.clear();
  
  // Restore theme preference if it existed
  if (theme) {
    localStorage.setItem('user-theme', theme);
  }
  
  console.log('Auth tokens cleared successfully');
};

/**
 * Google OAuth integration placeholder
 * 
 * @todo Implement Google OAuth authentication flow
 * This would typically redirect to Google's OAuth endpoint and
 * handle the callback with an authorization code.
 * 
 * @function loginWithGoogle
 * @returns {Promise<void>}
 * 
 * @example
 * ```typescript
 * // Planned implementation
 * export const loginWithGoogle = async () => {
 *   const clientId = process.env.GOOGLE_CLIENT_ID;
 *   const redirectUri = `${window.location.origin}/auth/google/callback`;
 *   const scope = 'email profile';
 *   
 *   const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
 *     `client_id=${clientId}&` +
 *     `redirect_uri=${encodeURIComponent(redirectUri)}&` +
 *     `response_type=code&` +
 *     `scope=${encodeURIComponent(scope)}`;
 *   
 *   window.location.href = authUrl;
 * };
 * ```
 */
// TODO: Google OAuth integration
// export const loginWithGoogle = async () => {
//   // Implement Google OAuth flow
//   // This would redirect to Google OAuth endpoint
// };