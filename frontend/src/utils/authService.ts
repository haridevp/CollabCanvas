import api from '../api/axios';

export const registerUser = async (userData: any) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const loginWithEmailPassword = async (credentials: any, activityData: any) => {
  const response = await api.post('/auth/login', { ...credentials, activityData });
  return response.data;
};

export const checkUsernameAvailability = async (username: string) => {
  const response = await api.get(`/auth/check-username/${username}`);
  return response.data;
};

// NEW: Call the backend to verify the token
export const verifyEmailToken = async (token: string) => {
  try {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  } catch (error: any) {
    return error.response?.data || { success: false, message: "Verification failed" };
  }
};

export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
};

export const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string) => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};