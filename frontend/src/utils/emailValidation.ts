/**
 * Email validation utility
 * Provides comprehensive email validation and verification
 */

/**
 * Validates email format using regex
 * @param email - Email address to validate
 * @returns Validation result with message
 */
export const validateEmailFormat = (email: string): { valid: boolean; message: string } => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!email.trim()) {
    return { valid: false, message: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }
  
  // Check for disposable email domains (simplified list for demo)
  const disposableDomains = [
    'tempmail.com',
    'throwaway.com',
    'fakeinbox.com',
    'guerrillamail.com'
  ];
  
  const domain = email.split('@')[1];
  if (disposableDomains.includes(domain.toLowerCase())) {
    return { 
      valid: false, 
      message: 'Disposable email addresses are not allowed' 
    };
  }
  
  return { valid: true, message: 'Email format is valid' };
};

/**
 * Simulates email verification by sending a verification email
 * In production, this would call your backend API
 * 
 * @param email - Email address to verify
 * @param username - Username associated with the email
 * @returns Promise with verification result
 */
export const sendVerificationEmail = async (
  email: string, 
  username: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In production, this would be a real API call:
    // const response = await fetch('/api/auth/send-verification-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, username })
    // });
    // 
    // return await response.json();
    
    console.log(`Verification email sent to: ${email} for user: ${username}`);
    
    return {
      success: true,
      message: 'Verification email sent successfully'
    };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return {
      success: false,
      message: 'Failed to send verification email. Please try again.'
    };
  }
};

/**
 * Simulates email verification token validation
 * In production, this would call your backend API
 * 
 * @param token - Verification token
 * @returns Promise with verification result
 */
export const verifyEmailToken = async (token: string): Promise<{
  success: boolean;
  message: string;
  email?: string;
}> => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In production, this would be a real API call:
    // const response = await fetch(`/api/auth/verify-email?token=${token}`);
    // return await response.json();
    
    // Mock token validation (in real app, this would decode and validate JWT)
    const isValidToken = token && token.length > 10;
    
    if (isValidToken) {
      // Mock email extraction from token
      const mockEmail = 'user@example.com';
      
      return {
        success: true,
        message: 'Email verified successfully!',
        email: mockEmail
      };
    }
    
    return {
      success: false,
      message: 'Invalid or expired verification token'
    };
  } catch (error) {
    console.error('Email verification failed:', error);
    return {
      success: false,
      message: 'Verification failed. Please try again or request a new verification email.'
    };
  }
};

/**
 * Resends verification email
 * 
 * @param email - Email address to resend verification to
 * @returns Promise with result
 */
export const resendVerificationEmail = async (email: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Resent verification email to: ${email}`);
    
    return {
      success: true,
      message: 'Verification email has been resent. Please check your inbox.'
    };
  } catch (error) {
    console.error('Failed to resend verification email:', error);
    return {
      success: false,
      message: 'Failed to resend verification email. Please try again.'
    };
  }
};