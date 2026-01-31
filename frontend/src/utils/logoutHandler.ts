/**
 * Logout Handler Utility
 * Centralized logout functionality with feedback
 */

import { clearAuthTokens } from './authService';

/**
 * Executes logout with optional feedback
 */
export const performLogout = async (options?: {
  showConfirmation?: boolean;
  showSuccess?: boolean;
  redirectTo?: string;
}): Promise<void> => {
  const {
    showConfirmation = true,
    showSuccess = true,
    redirectTo = '/login'
  } = options || {};

  // Show confirmation if requested
  if (showConfirmation) {
    const confirmed = window.confirm(
      'Are you sure you want to sign out? You will need to sign in again to access your account.'
    );
    
    if (!confirmed) {
      return;
    }
  }

  try {
    // Clear authentication tokens
    clearAuthTokens();
    
    // Clear user data from localStorage
    localStorage.removeItem('user-data');
    localStorage.removeItem('login_activities');
    
    // Keep theme preference
    const theme = localStorage.getItem('user-theme');
    localStorage.clear();
    if (theme) {
      localStorage.setItem('user-theme', theme);
    }
    
    // Show success feedback if requested
    if (showSuccess) {
      console.log('User signed out successfully');
      // In a real app, you might use a toast notification here
    }
    
    // Redirect to login page
    if (redirectTo) {
      window.location.href = redirectTo;
    }
  } catch (error) {
    console.error('Logout failed:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
};

/**
 * Checks if user is signed in
 */
export const isSignedIn = (): boolean => {
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('user-data');
  return !!(token && userData);
};

/**
 * Gets user data from localStorage
 */
export const getCurrentUser = (): any => {
  try {
    const userData = localStorage.getItem('user-data');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};