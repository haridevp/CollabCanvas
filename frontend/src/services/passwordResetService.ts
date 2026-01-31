/**
 * Password Reset Service
 * Mock service for password reset functionality
 * In production, this would call actual backend APIs
 */

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  resetToken?: string;
  expiresAt?: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Mock function to request password reset
 * In production, this would call: POST /api/auth/forgot-password
 */
export const requestPasswordReset = async (
  email: string
): Promise<PasswordResetResponse> => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation
    if (!email || !email.includes('@')) {
      return {
        success: false,
        message: 'Please provide a valid email address'
      };
    }
    
    // Mock successful response
    const resetToken = `reset-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
    
    // Store token in localStorage for demo (in production, backend would handle this)
    localStorage.setItem('reset_token', resetToken);
    localStorage.setItem('reset_token_expires', expiresAt);
    localStorage.setItem('reset_email', email);
    
    console.log(`Password reset requested for: ${email}`);
    console.log(`Mock reset token: ${resetToken}`);
    
    return {
      success: true,
      message: 'Password reset email sent successfully',
      resetToken,
      expiresAt
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      message: 'Failed to send reset email. Please try again.'
    };
  }
};

/**
 * Mock function to validate reset token
 * In production, this would call: GET /api/auth/validate-reset-token/:token
 */
export const validateResetToken = async (
  token: string
): Promise<{ valid: boolean; message: string; email?: string }> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock token validation
    const storedToken = localStorage.getItem('reset_token');
    const storedExpires = localStorage.getItem('reset_token_expires');
    
    if (!storedToken || storedToken !== token) {
      return {
        valid: false,
        message: 'Invalid reset token'
      };
    }
    
    if (storedExpires && new Date(storedExpires) < new Date()) {
      return {
        valid: false,
        message: 'Reset token has expired'
      };
    }
    
    const email = localStorage.getItem('reset_email');
    
    return {
      valid: true,
      message: 'Valid reset token',
      email: email || 'user@example.com'
    };
  } catch (error) {
    console.error('Token validation error:', error);
    return {
      valid: false,
      message: 'Unable to validate token'
    };
  }
};

/**
 * Mock function to reset password
 * In production, this would call: POST /api/auth/reset-password
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Validate token first
    const validation = await validateResetToken(token);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      };
    }
    
    // Mock password validation
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters long'
      };
    }
    
    // Mock successful password reset
    console.log(`Password reset for email: ${validation.email}`);
    console.log(`New password set: ${newPassword}`);
    
    // Clear reset tokens
    localStorage.removeItem('reset_token');
    localStorage.removeItem('reset_token_expires');
    localStorage.removeItem('reset_email');
    
    return {
      success: true,
      message: 'Password has been reset successfully'
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'Failed to reset password. Please try again.'
    };
  }
};

/**
 * Mock function to check if user has recently requested password reset
 * In production, this would track rate limiting on the backend
 */
export const canRequestReset = (email: string): boolean => {
  const lastRequestTime = localStorage.getItem(`reset_request_${email}`);
  
  if (!lastRequestTime) {
    return true;
  }
  
  const lastRequest = new Date(lastRequestTime).getTime();
  const now = Date.now();
  const cooldownPeriod = 5 * 60 * 1000; // 5 minutes cooldown
  
  return now - lastRequest > cooldownPeriod;
};

/**
 * Mock function to track reset request
 */
export const trackResetRequest = (email: string): void => {
  localStorage.setItem(`reset_request_${email}`, new Date().toISOString());
};