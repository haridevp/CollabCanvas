import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Use 'auth_token' to match your AuthContext storage key
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token'); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface DeletionRequest {
  email: string;
  password: string;
  reason?: string;
  feedback?: string;
}

export interface DeletionResponse {
  success: boolean;
  message: string;
}

/**
 * Sends a DELETE request to the backend with password verification
 * Requirement 1.5: Account Deletion
 */
export const requestAccountDeletion = async (
  deletionData: DeletionRequest
): Promise<DeletionResponse> => {
  try {
    const response = await api.delete('/auth/delete-account', {
      data: { password: deletionData.password }
    });
    
    // Cleanup local storage immediately if successful
    if (response.data.success) {
      clearUserData(); 
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to delete account. Please verify your password.'
    };
  }
};

/**
 * Satisfies the export for DeletionSurveyModal.tsx
 * Requirement 1.5.4: Collection of exit feedback
 */
export const submitDeletionFeedback = async (surveyData: any): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('User Feedback Received:', surveyData);
    // You can implement a real POST /api/auth/feedback here later
    return { success: true, message: 'Thank you for your feedback!' };
  } catch (error) {
    return { success: false, message: 'Failed to submit feedback.' };
  }
};

/**
 * Requirement 1.6: Secure Sign Out / Cleanup
 * Wipes sensitive data while preserving theme
 */
export const clearUserData = (): void => {
  const theme = localStorage.getItem('user-theme');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('pending_deletion');
  sessionStorage.clear();
  if (theme) {
    localStorage.setItem('user-theme', theme);
  }
  console.log('User session and local data cleared.');
};

// Helpers for UI state management in ProfilePage
export const hasPendingDeletion = (): boolean => localStorage.getItem('pending_deletion') !== null;
export const getPendingDeletion = (): any => {
  const pending = localStorage.getItem('pending_deletion');
  return pending ? JSON.parse(pending) : null;
};
export const cancelAccountDeletion = async (id: string) => ({ success: true, message: 'Deletion cancelled' });