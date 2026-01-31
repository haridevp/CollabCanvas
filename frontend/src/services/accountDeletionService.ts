/**
 * Account Deletion Service
 * Mock service for account deletion functionality
 * In production, this would call actual backend APIs
 */

export interface DeletionRequest {
  email: string;
  password: string;
  reason?: string;
  feedback?: string;
}

export interface DeletionResponse {
  success: boolean;
  message: string;
  deletionId?: string;
  scheduledFor?: string;
}

export interface DeletionSurvey {
  reason: string;
  feedback: string;
  improvementSuggestions?: string;
  willingToParticipate?: boolean;
  contactForFeedback?: boolean;
}

/**
 * Mock function to request account deletion
 * In production, this would call: POST /api/user/delete-account
 */
export const requestAccountDeletion = async (
  deletionRequest: DeletionRequest
): Promise<DeletionResponse> => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock validation
    if (!deletionRequest.email || !deletionRequest.password) {
      return {
        success: false,
        message: 'Email and password are required'
      };
    }
    
    // Mock password verification (in production, this would be done on backend)
    const storedEmail = localStorage.getItem('user-email');
    if (deletionRequest.email !== storedEmail) {
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }
    
    // Generate deletion ID
    const deletionId = `del-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
    
    // Store deletion request for demo (in production, backend would handle this)
    localStorage.setItem('pending_deletion', JSON.stringify({
      id: deletionId,
      email: deletionRequest.email,
      scheduledFor,
      requestedAt: new Date().toISOString(),
      reason: deletionRequest.reason
    }));
    
    // Schedule confirmation email (in production, backend would send this)
    console.log(`Account deletion requested for: ${deletionRequest.email}`);
    console.log(`Deletion ID: ${deletionId}`);
    console.log(`Scheduled for: ${scheduledFor}`);
    
    // Mock sending confirmation email
    setTimeout(() => {
      console.log(`Confirmation email would be sent to: ${deletionRequest.email}`);
    }, 1000);
    
    return {
      success: true,
      message: 'Account deletion requested successfully. Please check your email for confirmation.',
      deletionId,
      scheduledFor
    };
  } catch (error) {
    console.error('Account deletion request error:', error);
    return {
      success: false,
      message: 'Failed to request account deletion. Please try again.'
    };
  }
};

/**
 * Mock function to cancel account deletion
 * In production, this would call: POST /api/user/cancel-deletion
 */
export const cancelAccountDeletion = async (
  deletionId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pendingDeletion = localStorage.getItem('pending_deletion');
    if (!pendingDeletion) {
      return {
        success: false,
        message: 'No pending deletion found'
      };
    }
    
    const deletionData = JSON.parse(pendingDeletion);
    if (deletionData.id !== deletionId) {
      return {
        success: false,
        message: 'Invalid deletion ID'
      };
    }
    
    // Remove pending deletion
    localStorage.removeItem('pending_deletion');
    
    console.log(`Account deletion cancelled for: ${deletionData.email}`);
    
    return {
      success: true,
      message: 'Account deletion has been cancelled successfully.'
    };
  } catch (error) {
    console.error('Cancel deletion error:', error);
    return {
      success: false,
      message: 'Failed to cancel deletion. Please try again.'
    };
  }
};

/**
 * Mock function to submit deletion feedback survey
 * In production, this would call: POST /api/user/deletion-feedback
 */
export const submitDeletionFeedback = async (
  survey: DeletionSurvey
): Promise<{ success: boolean; message: string }> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Store survey data (in production, this would go to backend)
    const surveys = JSON.parse(localStorage.getItem('deletion_surveys') || '[]');
    surveys.push({
      ...survey,
      submittedAt: new Date().toISOString()
    });
    
    localStorage.setItem('deletion_surveys', JSON.stringify(surveys));
    
    console.log('Deletion feedback submitted:', survey);
    
    return {
      success: true,
      message: 'Thank you for your feedback!'
    };
  } catch (error) {
    console.error('Feedback submission error:', error);
    return {
      success: false,
      message: 'Failed to submit feedback. Please try again.'
    };
  }
};

/**
 * Check if user has pending deletion
 */
export const hasPendingDeletion = (): boolean => {
  return localStorage.getItem('pending_deletion') !== null;
};

/**
 * Get pending deletion details
 */
export const getPendingDeletion = (): any => {
  const pending = localStorage.getItem('pending_deletion');
  return pending ? JSON.parse(pending) : null;
};

/**
 * Clear all user data (for frontend cleanup)
 */
export const clearUserData = (): void => {
  // Clear all user-related data
  const itemsToKeep = ['user-theme']; // Keep theme preference
  const theme = localStorage.getItem('user-theme');
  
  // Clear localStorage except theme
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !itemsToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  }
  
  // Restore theme if it exists
  if (theme) {
    localStorage.setItem('user-theme', theme);
  }
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  console.log('User data cleared from frontend storage');
};