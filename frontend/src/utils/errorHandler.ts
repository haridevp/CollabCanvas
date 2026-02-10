/**
 * Error Handling Utilities Module
 * 
 * Provides centralized error handling for authentication and user interactions.
 * Includes error definitions, message formatting, and display utilities.
 * 
 * @module ErrorHandling
 */

/**
 * Interface defining the structure of error messages displayed to users
 * 
 * @interface ErrorMessage
 */
export interface ErrorMessage {
  /** User-facing error title */
  title: string;
  /** Detailed error message explaining the issue */
  message: string;
  /** Type of message affecting visual styling and icon */
  type: 'error' | 'warning' | 'info' | 'success';
  /** Optional error code for debugging and translation */
  code?: string;
  /** Optional suggested action for the user */
  action?: string;
}

/**
 * Authentication error definitions with user-friendly messages
 * 
 * Centralized error definitions ensure consistent messaging across the application.
 * Each error includes a unique code for debugging and translation keys.
 * 
 * @constant {Object} AUTH_ERRORS
 */
export const AUTH_ERRORS = {
  /** Error when email or password is incorrect */
  INVALID_CREDENTIALS: {
    code: 'AUTH_001',
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect. Please try again.',
    type: 'error' as const
  },
  
  /** Error when account is locked due to security reasons */
  ACCOUNT_LOCKED: {
    code: 'AUTH_002',
    title: 'Account Locked',
    message: 'Your account has been locked due to too many failed login attempts. Please try again in 15 minutes or reset your password.',
    type: 'error' as const
  },
  
  /** Warning when user tries to login with unverified email */
  EMAIL_NOT_VERIFIED: {
    code: 'AUTH_003',
    title: 'Email Not Verified',
    message: 'Please verify your email address before logging in. Check your inbox for the verification email.',
    type: 'warning' as const
  },
  
  /** Error when network connection fails */
  NETWORK_ERROR: {
    code: 'AUTH_004',
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    type: 'error' as const
  },
  
  /** Warning when user's session has expired */
  SESSION_EXPIRED: {
    code: 'AUTH_005',
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again to continue.',
    type: 'warning' as const
  },
  
  /** Error when Google OAuth authentication fails */
  GOOGLE_AUTH_FAILED: {
    code: 'AUTH_006',
    title: 'Google Login Failed',
    message: 'Unable to sign in with Google. Please try again or use email/password.',
    type: 'error' as const
  },
  
  /** Error for server-side issues */
  SERVER_ERROR: {
    code: 'AUTH_007',
    title: 'Server Error',
    message: 'An unexpected error occurred on the server. Please try again later.',
    type: 'error' as const
  },
  
  /** Error when rate limiting is triggered */
  RATE_LIMITED: {
    code: 'AUTH_008',
    title: 'Too Many Attempts',
    message: 'Too many login attempts. Please wait a few minutes before trying again.',
    type: 'error' as const
  }
} as const;

/**
 * Maps raw error objects to user-friendly error messages
 * 
 * This function analyzes error objects, strings, or HTTP responses
 * and returns appropriate ErrorMessage objects for display.
 * 
 * @function getAuthErrorMessage
 * @param {any} error - Raw error from API call, network request, or thrown error
 * @param {string} [defaultMessage='An unexpected error occurred'] - Fallback message
 * @returns {ErrorMessage} User-friendly error message object
 * 
 * @example
 * ```typescript
 * // Handle API errors
 * try {
 *   await login(email, password);
 * } catch (error) {
 *   const userError = getAuthErrorMessage(error);
 *   displayErrorMessage(userError);
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Handle string errors
 * const errorMessage = getAuthErrorMessage('Invalid credentials');
 * // Returns: AUTH_ERRORS.INVALID_CREDENTIALS
 * ```
 * 
 * @remarks
 * Error matching priority:
 * 1. String pattern matching (case-insensitive)
 * 2. HTTP status codes from error.response
 * 3. Error.message content
 * 4. Default error message
 */
export const getAuthErrorMessage = (
  error: any, 
  defaultMessage: string = 'An unexpected error occurred'
): ErrorMessage => {
  // Handle string errors by pattern matching
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
  
  // Handle error objects with HTTP response status codes
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
  
  // Return default error when no specific match found
  return {
    code: 'UNKNOWN',
    title: 'Error',
    message: defaultMessage,
    type: 'error'
  };
};

/**
 * Displays error messages to the user
 * 
 * This function provides a centralized way to show error messages.
 * In production, this would integrate with a toast notification system.
 * 
 * @function displayErrorMessage
 * @param {ErrorMessage} error - Error message object to display
 * @returns {void}
 * 
 * @example
 * ```typescript
 * // Display authentication error
 * displayErrorMessage(AUTH_ERRORS.INVALID_CREDENTIALS);
 * ```
 * 
 * @example
 * ```typescript
 * // Using with getAuthErrorMessage
 * try {
 *   await apiCall();
 * } catch (error) {
 *   const userError = getAuthErrorMessage(error);
 *   displayErrorMessage(userError);
 * }
 * ```
 * 
 * @remarks
 * Current implementation uses alert() for simplicity.
 * In production, replace with:
 * - Toast notifications (react-hot-toast, sonner, etc.)
 * - Modal dialogs for critical errors
 * - Inline form error displays
 * - Notification systems with action buttons
 */
export const displayErrorMessage = (error: ErrorMessage): void => {
  // Map message types to emoji icons
  const icon = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅'
  }[error.type];
  
  // Display formatted alert (replace with toast in production)
  alert(`${icon} ${error.title}\n\n${error.message}`);
};

/**
 * Logs errors with context for debugging purposes
 * 
 * Provides structured error logging with timestamps and context
 * to help with debugging and monitoring.
 * 
 * @function logError
 * @param {any} error - Error object, string, or any error value
 * @param {string} [context='Authentication'] - Context where error occurred
 * @returns {void}
 * 
 * @example
 * ```typescript
 * // Log API errors
 * try {
 *   await fetchData();
 * } catch (error) {
 *   logError(error, 'Data Fetching');
 *   // Handle error...
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Log with custom context
 * logError(new Error('Component failed'), 'UserProfileComponent');
 * ```
 * 
 * @remarks
 * Logs include:
 * - Timestamp for tracking when errors occur
 * - Error message and stack trace
 * - Context information
 * - Response data (if available)
 * 
 * In production, integrate with:
 * - Sentry/Rollbar for error monitoring
 * - Log aggregation services (Datadog, ELK)
 * - Server-side logging
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