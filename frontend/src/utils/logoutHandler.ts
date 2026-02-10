// src/utils/logoutHandler.ts
/**
 * Logout Handler Utility Module
 * 
 * Provides centralized logout functionality with user feedback and cleanup.
 * Handles authentication token cleanup, user confirmation, and redirection.
 * 
 * @module LogoutHandler
 */

/**
 * Clears all authentication tokens and user data from browser storage
 * 
 * This function performs a comprehensive cleanup of authentication data
 * while preserving the user's theme preference. It removes:
 * - Authentication tokens
 * - User data
 * - Login activities history
 * - Remembered email
 * - Session storage data
 * 
 * @function clearAuthTokens
 * @returns {void}
 * 
 * @example
 * ```typescript
 * // Manual token cleanup
 * clearAuthTokens();
 * console.log('User tokens cleared');
 * ```
 * 
 * @example
 * ```typescript
 * // Integration with logout flow
 * const handleLogout = () => {
 *   clearAuthTokens();
 *   navigate('/login');
 * };
 * ```
 * 
 * @remarks
 * The function preserves the user's theme preference by:
 * 1. Storing the theme before cleanup
 * 2. Clearing all auth-related data
 * 3. Restoring the theme after cleanup
 * 
 * This ensures users don't lose their UI preference when logging out.
 */
export const clearAuthTokens = (): void => {
  // Preserve user's theme preference
  const theme = localStorage.getItem('user-theme');
  
  // Clear all authentication-related data
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
 * Executes complete logout flow with optional user feedback and redirection
 * 
 * This function provides a complete logout experience including:
 * 1. Optional user confirmation
 * 2. Authentication cleanup
 * 3. Success feedback
 * 4. Automatic redirection
 * 
 * @async
 * @function performLogout
 * @param {Object} [options] - Configuration options for logout behavior
 * @param {boolean} [options.showConfirmation=true] - Show confirmation dialog before logout
 * @param {boolean} [options.showSuccess=true] - Log success message to console
 * @param {string} [options.redirectTo='/login'] - URL to redirect to after logout
 * @returns {Promise<void>} Promise that resolves when logout completes
 * 
 * @example
 * ```typescript
 * // Basic logout with default options
 * await performLogout();
 * ```
 * 
 * @example
 * ```typescript
 * // Custom logout with specific options
 * await performLogout({
 *   showConfirmation: false, // Skip confirmation for forced logout
 *   showSuccess: true,
 *   redirectTo: '/' // Redirect to home page
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Integration with React component
 * const handleLogoutClick = async () => {
 *   try {
 *     await performLogout({ showConfirmation: true });
 *   } catch (error) {
 *     console.error('Logout failed:', error);
 *     // Show error notification to user
 *   }
 * };
 * ```
 * 
 * @throws {Error} If logout process fails
 * 
 * @remarks
 * For production use, consider:
 * 1. Adding server-side logout (invalidate tokens on server)
 * 2. Integrating with toast notifications instead of console.log
 * 3. Adding analytics tracking for logout events
 * 4. Handling edge cases like network errors during redirect
 */
export const performLogout = async (options?: {
  showConfirmation?: boolean;
  showSuccess?: boolean;
  redirectTo?: string;
}): Promise<void> => {
  // Set default options if not provided
  const {
    showConfirmation = true,
    showSuccess = true,
    redirectTo = '/login'
  } = options || {};

  // Show confirmation dialog if enabled
  if (showConfirmation) {
    const confirmed = window.confirm(
      'Are you sure you want to sign out? You will need to sign in again to access your account.'
    );
    
    if (!confirmed) {
      return; // User cancelled logout
    }
  }

  try {
    // Clear all authentication tokens and data
    clearAuthTokens();
    
    // Provide success feedback if enabled
    if (showSuccess) {
      console.log('User signed out successfully');
      // TODO: Replace with toast notification in production
      // toast.success('Signed out successfully');
    }
    
    // Redirect to specified location
    if (redirectTo) {
      window.location.href = redirectTo;
    }
  } catch (error) {
    console.error('Logout failed:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
};

/**
 * Checks if a user is currently signed in
 * 
 * Determines authentication status by checking for the presence of
 * both auth token and user data in localStorage.
 * 
 * @function isSignedIn
 * @returns {boolean} True if user is authenticated, false otherwise
 * 
 * @example
 * ```typescript
 * // Check auth status on page load
 * useEffect(() => {
 *   if (!isSignedIn()) {
 *     navigate('/login');
 *   }
 * }, []);
 * ```
 * 
 * @example
 * ```typescript
 * // Conditionally render UI based on auth status
 * function UserProfile() {
 *   return isSignedIn() ? <PrivateProfile /> : <PublicProfile />;
 * }
 * ```
 * 
 * @remarks
 * This function only checks for the presence of tokens in localStorage.
 * For more robust authentication checking, consider:
 * 1. Validating token expiration
 * 2. Making a lightweight API call to verify token validity
 * 3. Implementing proper session management
 */
export const isSignedIn = (): boolean => {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('user');
  return !!(token && user);
};

/**
 * Retrieves the current user's data from localStorage
 * 
 * Parses and returns the user object stored in localStorage.
 * Handles JSON parsing errors gracefully.
 * 
 * @function getCurrentUser
 * @returns {any} Parsed user object or null if not found/invalid
 * 
 * @example
 * ```typescript
 * // Get user data for display
 * const user = getCurrentUser();
 * if (user) {
 *   console.log(`Welcome back, ${user.displayName || user.email}`);
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Use user data in UI
 * function UserAvatar() {
 *   const user = getCurrentUser();
 *   return user?.avatar 
 *     ? <img src={user.avatar} alt={user.displayName} />
 *     : <DefaultAvatar />;
 * }
 * ```
 * 
 * @remarks
 * Returns null in these cases:
 * 1. No user data in localStorage
 * 2. Invalid JSON in user data
 * 3. Any parsing error
 * 
 * Consider implementing a more robust user data management system
 * with proper typing and validation.
 */
export const getCurrentUser = (): any => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};