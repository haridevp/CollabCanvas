import React, { useState, useEffect } from 'react';
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff, Globe, Clock, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import {
  loginWithEmailPassword,
  getDeviceType
} from '../utils/authService';

/**
 * Login activity interface for tracking user login history
 * @interface LoginActivity
 */
interface LoginActivity {
  /** Timestamp of the login activity */
  timestamp: string;
  /** IP address from which login was attempted */
  ipAddress: string;
  /** Type of device used for login */
  deviceType: string;
}

/**
 * Error state interface for login form validation and API errors
 * @interface LoginError
 */
interface LoginError {
  /** Error title displayed to user */
  title: string;
  /** Detailed error message */
  message: string;
  /** Type of error - 'error' or 'success' */
  type: 'error' | 'success';
}

/**
 * LoginPage component - Provides user authentication with email/password
 * 
 * This component renders a login form with email/password fields, "Remember Me" functionality,
 * and displays recent login activities for security awareness. It integrates with the 
 * application's authentication context and handles form validation, submission, and error states.
 * 
 * @component
 * @example
 * ```tsx
 * // In your router configuration
 * <Route path="/login" element={<LoginPage />} />
 * ```
 * 
 * @returns {JSX.Element} The rendered login page with form and activity log
 */
const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form state management
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<LoginError | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [recentActivities, setRecentActivities] = useState<LoginActivity[]>([]);

  /**
   * Checks for verification/success messages from navigation state
   * Clears the state to prevent message persistence on refresh
   * 
   * @effect
   * @listens location.state.message
   */
  useEffect(() => {
    if (location.state?.message) {
      setError({
        title: 'Notification',
        message: location.state.message,
        type: 'success'
      });
      // Clear the state so message doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  /**
   * Loads recent login activities and remembered email on component mount
   * Fetches up to 3 most recent activities from localStorage
   * 
   * @effect
   * @listens [] (runs once on mount)
   */
  useEffect(() => {
    const activities = JSON.parse(localStorage.getItem('login_activities') || '[]');
    setRecentActivities(activities.slice(0, 3));

    // Load remembered email from localStorage
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  /**
   * Handles login form submission
   * Validates input, makes authentication API call, and manages authentication state
   * 
   * @async
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   * @returns {Promise<void>}
   * 
   * @throws {Error} When server connection fails or credentials are invalid
   * 
   * @example
   * ```tsx
   * <form onSubmit={handleSubmit}>
   *   {/* form fields * /}
   * </form>
   * ```
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic UI Validation
    if (!email.trim() || !password.trim()) {
      setError({
        title: 'Input Error',
        message: 'Please enter both email and password',
        type: 'error'
      });
      setIsLoading(false);
      return;
    }

    try {
      const activityData = {
        deviceType: getDeviceType(),
        ipAddress: 'Auto-detected by server' // TODO: Implement actual IP detection
      };

      // Call the backend authentication service
      const result = await loginWithEmailPassword({ email, password }, activityData);

      if (result.success && result.token && result.user) {
        // Sync with AuthContext (token, userData)
        login(result.token, result.user);

        // Handle "Remember Me" functionality
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }

        // Navigate to dashboard or intended destination
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        // Display the specific error message from the backend
        setError({
          title: 'Login Failed',
          message: result.message || 'An error occurred during login',
          type: 'error'
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);

      // Check if we have a response from the server
      if (err.response) {
        // Server responded with an error status
        const statusCode = err.response.status;
        const errorMessage = err.response.data?.message;

        if (statusCode === 401) {
          // Unauthorized - Invalid credentials
          setError({
            title: 'Authentication Failed',
            message: errorMessage || 'Invalid email or password',
            type: 'error'
          });
        } else if (statusCode === 403) {
          // Forbidden - Email not verified
          setError({
            title: 'Email Not Verified',
            message: errorMessage || 'Please verify your email before logging in',
            type: 'error'
          });
        } else if (statusCode === 500) {
          // Server Error
          setError({
            title: 'Server Error',
            message: errorMessage || 'An error occurred on the server. Please try again later.',
            type: 'error'
          });
        } else {
          // Other error codes
          setError({
            title: 'Login Failed',
            message: errorMessage || 'An unexpected error occurred',
            type: 'error'
          });
        }
      } else if (err.request) {
        // Request was made but no response received (network error)
        setError({
          title: 'Connection Error',
          message: 'Could not connect to the server. Please check your internet connection and try again.',
          type: 'error'
        });
      } else {
        // Something else happened
        setError({
          title: 'Error',
          message: 'An unexpected error occurred. Please try again.',
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Formats a timestamp string into a readable time format
   * 
   * @param {string} timestamp - ISO timestamp string to format
   * @returns {string} Formatted time string (HH:MM)
   * 
   * @example
   * ```typescript
   * formatTimestamp('2024-01-15T10:30:00Z'); // Returns '10:30'
   * ```
   */
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid time';
    }
  };

  /**
   * Renders a recent activity item with device and IP information
   * 
   * @param {LoginActivity} activity - The login activity data
   * @param {number} index - Index for React key
   * @returns {JSX.Element} Activity card component
   */
  const renderActivityItem = (activity: LoginActivity, index: number) => (
    <div key={index} className="p-4 rounded-lg border bg-slate-50 border-slate-200">
      <div className="flex justify-between items-start">
        <span className="font-medium text-slate-700">Successful Login</span>
        <span className="text-xs text-slate-500">{formatTimestamp(activity.timestamp)}</span>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Globe size={14} aria-hidden="true" />
          {activity.ipAddress}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={14} aria-hidden="true" />
          {activity.deviceType}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8">

        {/* Left column - Login form */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">

            {/* Header Section */}
            <div className="text-center mb-8">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="text-blue-600" size={32} aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
              <p className="text-slate-500">Log in to continue your session</p>
            </div>

            {/* Error/Success message display */}
            {error && (
              <div
                className={`mb-6 p-4 rounded-lg border ${error.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-green-50 border-green-200 text-green-800'
                  }`}
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{error.title}</h3>
                    <p className="text-sm">{error.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-3 text-slate-400"
                    size={20}
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:underline"
                    aria-label="Forgot password? Click to reset"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 text-slate-400"
                    size={20}
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  aria-checked={rememberMe}
                />
                <label htmlFor="remember" className="ml-2 text-sm text-slate-700">
                  Remember me
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-3"
                isLoading={isLoading}
                aria-label={isLoading ? "Signing in..." : "Sign in to account"}
              >
                Sign In
              </Button>
            </form>

            {/* Registration Link */}
            <p className="text-center mt-8 text-slate-600">
              New here?{' '}
              <Link
                to="/register"
                className="text-blue-600 font-semibold hover:underline"
                aria-label="Create a new account"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>

        {/* Right column - Activity Log */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 h-full">
            {/* Activity Header */}
            <div className="flex items-center gap-3 mb-6">
              <Clock className="text-blue-600" size={24} aria-hidden="true" />
              <h2 className="text-xl font-bold text-slate-900">Recent Login Activity</h2>
            </div>

            {/* Activity List */}
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map(renderActivityItem)}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">No recent activity found.</p>
              </div>
            )}

            {/* Security Tips Section */}
            <div className="mt-12 pt-6 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Security Tips</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5" aria-hidden="true" />
                  <span>Check the URL for the secure "https" lock icon.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5" aria-hidden="true" />
                  <span>Use a different password for every service.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;