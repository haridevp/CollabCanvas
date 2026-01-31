/**
 * Error handling utilities for authentication and user interactions
 */

export interface ErrorMessage {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  code?: string;
  action?: string;
}

/**
 * Authentication error codes and messages
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: {
    code: 'AUTH_001',
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect. Please try again.',
    type: 'error' as const
  },
  ACCOUNT_LOCKED: {
    code: 'AUTH_002',
    title: 'Account Locked',
    message: 'Your account has been locked due to too many failed login attempts. Please try again in 15 minutes or reset your password.',
    type: 'error' as const
  },
  EMAIL_NOT_VERIFIED: {
    code: 'AUTH_003',
    title: 'Email Not Verified',
    message: 'Please verify your email address before logging in. Check your inbox for the verification email.',
    type: 'warning' as const
  },
  NETWORK_ERROR: {
    code: 'AUTH_004',
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    type: 'error' as const
  },
  SESSION_EXPIRED: {
    code: 'AUTH_005',
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again to continue.',
    type: 'warning' as const
  },
  GOOGLE_AUTH_FAILED: {
    code: 'AUTH_006',
    title: 'Google Login Failed',
    message: 'Unable to sign in with Google. Please try again or use email/password.',
    type: 'error' as const
  },
  SERVER_ERROR: {
    code: 'AUTH_007',
    title: 'Server Error',
    message: 'An unexpected error occurred on the server. Please try again later.',
    type: 'error' as const
  },
  RATE_LIMITED: {
    code: 'AUTH_008',
    title: 'Too Many Attempts',
    message: 'Too many login attempts. Please wait a few minutes before trying again.',
    type: 'error' as const
  }
} as const;

/**
 * Get user-friendly error message based on error code or message
 */
export const getAuthErrorMessage = (
  error: any, 
  defaultMessage: string = 'An unexpected error occurred'
): ErrorMessage => {
  // Handle string errors
  if (typeof error === 'string') {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('invalid') || lowerError.includes('credentials')) {
      return AUTH_ERRORS.INVALID_CREDENTIALS;
    } else if (lowerError.includes('network') || lowerError.includes('connection')) {
      return AUTH_ERRORS.NETWORK_ERROR;
    } else if (lowerError.includes('verified')) {
      return AUTH_ERRORS.EMAIL_NOT_VERIFIED;
    } else if (lowerError.includes('locked')) {
      return AUTH_ERRORS.ACCOUNT_LOCKED;
    } else if (lowerError.includes('rate') || lowerError.includes('limit')) {
      return AUTH_ERRORS.RATE_LIMITED;
    }
  }
  
  // Handle error objects
  if (error?.response?.status === 401) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  } else if (error?.response?.status === 403) {
    return AUTH_ERRORS.ACCOUNT_LOCKED;
  } else if (error?.response?.status === 423) {
    return AUTH_ERRORS.EMAIL_NOT_VERIFIED;
  } else if (error?.response?.status === 429) {
    return AUTH_ERRORS.RATE_LIMITED;
  } else if (error?.response?.status === 500) {
    return AUTH_ERRORS.SERVER_ERROR;
  } else if (error?.message?.includes('Network Error')) {
    return AUTH_ERRORS.NETWORK_ERROR;
  }
  
  // Default error
  return {
    code: 'UNKNOWN',
    title: 'Error',
    message: defaultMessage,
    type: 'error'
  };
};

/**
 * Display error message to user (could be extended to use toast notifications)
 */
export const displayErrorMessage = (error: ErrorMessage): void => {
  // In production, you might use a toast notification library
  // For now, we'll use alert with better formatting
  
  const icon = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅'
  }[error.type];
  
  alert(`${icon} ${error.title}\n\n${error.message}`);
};

/**
 * Log error for debugging
 */
export const logError = (error: any, context: string = 'Authentication'): void => {
  console.error(`[${context}]`, {
    timestamp: new Date().toISOString(),
    error: error?.message || error,
    stack: error?.stack,
    code: error?.code,
    response: error?.response?.data
  });
};