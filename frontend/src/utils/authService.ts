import api from '../api/axios';

// User registration
export const registerUser = async (userData: any) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// Email/password login
export const loginWithEmailPassword = async (credentials: any, activityData: any) => {
  const response = await api.post('/auth/login', { ...credentials, activityData });
  return response.data;
};

// Username availability check
export const checkUsernameAvailability = async (username: string) => {
  const response = await api.get(`/auth/check-username/${username}`);
  return response.data;
};

// Profile update
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

// Email verification
export const verifyEmailToken = async (token: string) => {
  try {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: "Verification failed" };
  }
};

// Device type detection
export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
};

// Password reset - request
export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

// Password reset - confirm
export const resetPassword = async (token: string, password: string) => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};

// Search users
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

// Invite users to room
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

// Clear authentication tokens
export const clearAuthTokens = (): void => {
  // Keep theme preference
  const theme = localStorage.getItem('user-theme');
  
  // Clear all auth-related items
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('login_activities');
  localStorage.removeItem('remembered_email');
  
  // Clear session storage
  sessionStorage.clear();
  
  // Restore theme if it exists
  if (theme) {
    localStorage.setItem('user-theme', theme);
  }
  
  console.log('Auth tokens cleared successfully');
};

// TODO: Google OAuth integration
// export const loginWithGoogle = async () => {
//   // Implement Google OAuth flow
//   // This would redirect to Google OAuth endpoint
// };