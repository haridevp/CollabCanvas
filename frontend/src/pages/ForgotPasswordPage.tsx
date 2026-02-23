import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
// Updated to use the correct service we built
import { forgotPassword } from '../utils/authService';
import Background from '../components/ui/Background';
import TitleAnimation from '../components/ui/TitleAnimation';

/**
 * Forgot Password Page Component
 * 
 * This component handles the password reset request flow where users can
 * request a password reset link to be sent to their registered email.
 * 
 * @component
 * @returns {JSX.Element} The rendered forgot password page
 * 
 * @example
 * ```tsx
 * // Route configuration
 * <Route path="/forgot-password" element={<ForgotPasswordPage />} />
 * ```
 * 
 * @remarks
 * User Flow:
 * 1. User enters email address
 * 2. Form validates email format
 * 3. API call to send reset email
 * 4. Success state shows next steps
 * 5. Option to try different email
 * 
 * Security Features:
 * - Email validation before API call
 * - Rate limiting handled by backend
 * - No indication if email exists (prevents email enumeration)
 * - Reset links expire for security
 */
const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState('');

  /**
   * Validates email format before submission
   * 
   * @function validateEmail
   * @param {string} email - Email address to validate
   * @returns {string | null} Error message if invalid, null if valid
   * 
   * @example
   * ```typescript
   * const error = validateEmail('user@example.com');
   * // Returns: null (valid)
   * 
   * const error = validateEmail('invalid-email');
   * // Returns: 'Please enter a valid email address'
   * ```
   */
  const validateEmail = (email: string): string | null => {
    // Check for empty input
    if (!email.trim()) return 'Please enter your email address';

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';

    return null;
  };

  /**
   * Handles form submission for password reset request
   * 
   * @async
   * @function handleSubmit
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>}
   * 
   * @remarks
   * Process:
   * 1. Prevent default form submission
   * 2. Validate email format
   * 3. Call forgotPassword API
   * 4. Handle success/error responses
   * 5. Update UI state accordingly
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email before API call
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Set loading state and clear previous errors
    setIsLoading(true);
    setError(null);

    try {
      // Call backend API via authService
      const result = await forgotPassword(email);

      if (result.success) {
        // Success: show confirmation UI
        setSuccess(true);
        setEmailSent(email);
        setEmail(''); // Clear form for security
      } else {
        // API returned error
        setError(result.message);
      }
    } catch (err: any) {
      // Network or unexpected errors
      console.error('Password reset request error:', err);
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      // Reset loading state
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (success) {
      return (
        <div className="bg-white rounded-xl shadow-2xl p-6 border border-slate-100 flex flex-col justify-center text-center">
          <div className="mb-6 text-left">
            <Link to="/login" className="text-blue-600 hover:text-purple-700 flex items-center gap-2 text-xs font-bold transition-colors uppercase tracking-wider">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>

          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
            <CheckCircle className="text-green-600" size={32} />
          </div>

          <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block mb-4">Check Your Email</h1>
          <p className="text-slate-600 text-xs mb-2">We've sent a password reset link to:</p>
          <p className="font-bold text-black bg-slate-50 p-3 rounded-lg mb-6 border border-slate-200 text-sm">{emailSent}</p>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg text-left border border-slate-100">
              <h3 className="font-bold text-black text-xs uppercase tracking-wider mb-2">What's next?</h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0" />
                  <span>Click the link in the email to reset your password</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0" />
                  <span>The link will expire in 1 hour for security</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0" />
                  <span>Check your spam folder if you don't see it</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => setSuccess(false)}
              className="w-full py-3 bg-white hover:bg-slate-50 text-black font-semibold rounded-lg transition-all border border-slate-200 shadow-sm"
            >
              Try Different Email
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-2xl p-6 border border-slate-100 flex flex-col justify-center">
        <div className="mb-6">
          <Link to="/login" className="text-blue-600 hover:text-purple-700 flex items-center gap-2 text-xs font-bold transition-colors uppercase tracking-wider">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img
              src="/CollabCanvas/logo.png"
              alt="CollabCanvas Logo"
              style={{ height: '64px', width: 'auto' }}
              className="object-contain mx-auto"
            />
          </div>
          <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block">Reset Password</h1>
          <p className="text-slate-600 text-xs mt-1">Enter your email and we'll send a reset link</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-600" size={18} />
            <span className="text-red-700 text-xs font-medium">{error}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 px-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-black focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full py-3 bg-black hover:bg-slate-800 text-white font-semibold rounded-lg transition-all shadow-md active:scale-[0.98] border-none"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Send Reset Link
          </Button>
        </form>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Dynamic Background */}
      <Background />

      {/* Floating Title */}
      <div className="absolute top-12 left-0 w-full text-center z-10 pointer-events-none mb-24">
        <TitleAnimation />
      </div>

      <div className="w-full max-w-md z-20 mt-32">
        {renderContent()}
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-4 text-[10px] text-slate-400 font-medium tracking-tight uppercase z-10">
        &copy; 2026 CollabCanvas v1.0.0
      </div>
    </div>
  );
};

export default ForgotPasswordPage;