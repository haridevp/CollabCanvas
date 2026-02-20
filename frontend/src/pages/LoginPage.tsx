import React, { useState, useEffect } from 'react';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Globe, Clock, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import {
  loginWithEmailPassword,
  getDeviceType
} from '../utils/authService';
import TitleAnimation from '../components/ui/TitleAnimation';
import Background from '../components/ui/Background';
import axios from 'axios';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
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
        setError({
          title: 'Login Failed',
          message: result.message || 'An error occurred during login',
          type: 'error'
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response) {
        const statusCode = err.response.status;
        const errorMessage = err.response.data?.message;
        if (statusCode === 401) {
          setError({
            title: 'Authentication Failed',
            message: errorMessage || 'Invalid email or password',
            type: 'error'
          });
        } else if (statusCode === 403) {
          setError({
            title: 'Email Not Verified',
            message: errorMessage || 'Please verify your email before logging in',
            type: 'error'
          });
        } else if (statusCode === 500) {
          setError({
            title: 'Server Error',
            message: errorMessage || 'An error occurred on the server. Please try again later.',
            type: 'error'
          });
        } else {
          setError({
            title: 'Login Failed',
            message: errorMessage || 'An unexpected error occurred',
            type: 'error'
          });
        }
      } else if (err.request) {
        setError({
          title: 'Connection Error',
          message: 'Could not connect to the server. Please check your internet connection and try again.',
          type: 'error'
        });
      } else {
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

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid time';
    }
  };

  const renderActivityItem = (activity: LoginActivity, index: number) => (
    <div key={index} className="p-4 rounded-lg border bg-white border-slate-200">
      <div className="flex justify-between items-start">
        <span className="font-medium text-slate-800">Successful Login</span>
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

const handleGoogleSuccess = async (credentialResponse: any) => {
  try {
    const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/google-login`, {
      credential: credentialResponse.credential,
    });
    
    if (data.success) {
      login(data.token, data.user); // Update your global Auth state
      navigate('/dashboard');
    }
  } catch (err) {
    console.error("Google Login Error:", err);
  }
};

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Dynamic Background */}
      <Background />

      {/* Floating Title (using TitleAnimation) */}
      <div className="absolute top-12 left-0 w-full text-center z-10 pointer-events-none mb-24">
        <TitleAnimation />
      </div>

      {/* Container with top margin to avoid touching/overlapping the title */}
      <div className="w-full max-w-2xl flex flex-col lg:flex-row gap-6 z-20 mt-32">

        {/* Left column - Login form */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-xl shadow-2xl p-6 border border-slate-100 h-full flex flex-col justify-center">

            {/* Header Section */}
            <div className="text-center mb-6">
              <div className="mb-4 flex justify-center">
                <img
                  src="/CollabCanvas/logo.png"
                  alt="CollabCanvas Logo"
                  style={{ height: '64px', width: 'auto' }}
                  className="object-contain mx-auto"
                />
              </div>
              <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block">Welcome back</h1>
              <p className="text-slate-600 text-xs mt-1">Log in to continue your session</p>
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
                    <h3 className="font-semibold mb-1 text-sm">{error.title}</h3>
                    <p className="text-xs">{error.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 px-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-3 text-slate-400"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-black focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-1 px-1">
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-600 hover:text-purple-700 transition-colors font-medium"
                    aria-label="Forgot password? Click to reset"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 text-slate-400"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-200 rounded-lg text-black focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm"
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
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
                <div className="mt-6">
                  <GoogleLogin 
                    onSuccess={handleGoogleSuccess} 
                    onError={() => {
                      setError({
                        title: 'Login Failed',
                        message: 'Google Authentication was unsuccessful',
                        type: 'error'
                      });
                    }}
                    useOneTap
                  />
                </div>
              </GoogleOAuthProvider>

              {/* Remember Me Checkbox */}
              <div className="flex items-center px-1">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 text-black rounded border-slate-300 focus:ring-black accent-black"
                  aria-checked={rememberMe}
                />
                <label htmlFor="remember" className="ml-2 text-xs text-slate-600 font-medium">
                  Keep me signed in
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full py-3 bg-black hover:bg-slate-800 text-white font-semibold rounded-lg transition-all shadow-md active:scale-[0.98] mt-2 border-none"
                isLoading={isLoading}
                aria-label={isLoading ? "Signing in..." : "Sign in to account"}
              >
                Sign In
              </Button>
            </form>

            {/* Registration Link */}
            <p className="text-center mt-8 text-slate-600 text-sm">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-blue-600 font-bold hover:text-purple-700 transition-colors"
                aria-label="Create a new account"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>

        {/* Right column - Activity Log */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-xl shadow-2xl p-8 border border-slate-100 h-full flex flex-col">
            {/* Activity Header */}
            <div className="flex items-center gap-3 mb-6">
              <Clock className="text-black" size={22} aria-hidden="true" />
              <h2 className="text-xl font-bold text-black border-b-2 border-black pb-1">Activity Log</h2>
            </div>

            {/* Activity List */}
            {recentActivities.length > 0 ? (
              <div className="space-y-4 flex-1">
                {recentActivities.map(renderActivityItem)}
              </div>
            ) : (
              <div className="text-center py-12 flex-1 flex flex-col justify-center">
                <p className="text-slate-400 text-sm italic">No recent activity detected.</p>
              </div>
            )}

            {/* Security Tips Section */}
            <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50 -mx-8 px-8 rounded-b-xl">
              <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4">Security Insights</h3>
              <ul className="space-y-3 pb-4">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-xs text-slate-600 leading-relaxed font-medium">Ensure the URL matches <strong className="text-black">collabcanvas.com</strong> before logging in.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-xs text-slate-600 leading-relaxed font-medium">Enable 2FA in your security settings for enhanced protection.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-4 text-[10px] text-slate-400 font-medium tracking-tight uppercase z-10">
        &copy; 2026 CollabCanvas v1.0.0
      </div>
    </div>
  );
};

export default LoginPage;