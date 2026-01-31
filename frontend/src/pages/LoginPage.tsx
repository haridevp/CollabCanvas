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
 * LoginPage component - User authentication page
 * Provides login form with email/password and activity tracking
 */
const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Form state management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Check for verification/success messages from navigation state
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

  // Load recent login activities on component mount
  useEffect(() => {
    const activities = JSON.parse(localStorage.getItem('login_activities') || '[]');
    setRecentActivities(activities.slice(0, 3)); 
    
    // Load remembered email
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  /**
   * Handles login form submission
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    // Basic UI Validation
    if (!email.trim() || !password.trim()) {
      setError({ title: 'Input Error', message: 'Please enter both email and password', type: 'error' });
      setIsLoading(false);
      return;
    }
    
    try {
      const activityData = {
        deviceType: getDeviceType(),
        ipAddress: 'Auto-detected by server'
      };
      
      // Call the backend bridge
      const result = await loginWithEmailPassword({ email, password }, activityData);
      
      if (result.success && result.token && result.user) {
        // Sync with AuthContext (token, userData)
        login(result.token, result.user);
        
        // Handle "Remember Me"
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }
        
        // Navigate to dashboard or intended destination
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError({ title: 'Login Failed', message: result.message || 'Invalid credentials', type: 'error' });
      }
    } catch (err: any) {
      setError({ 
        title: 'Connection Error', 
        message: 'Could not connect to the server. Is your backend running?', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8">
        
        {/* Left column - Login form */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            
            <div className="text-center mb-8">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="text-blue-600" size={32} aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
              <p className="text-slate-500">Log in to continue your session</p>
            </div>

            {/* Error/Success message display */}
            {error && (
              <div className={`mb-6 p-4 rounded-lg border ${
                error.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{error.title}</h3>
                    <p className="text-sm">{error.message}</p>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Forgot?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="remember" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-slate-700">Remember me</label>
              </div>

              <Button type="submit" className="w-full py-3" isLoading={isLoading}>Sign In</Button>
            </form>

            <p className="text-center mt-8 text-slate-600">
              New here? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Create account</Link>
            </p>
          </div>
        </div>

        {/* Right column - Activity Log */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 h-full">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-slate-900">Recent Login Activity</h2>
            </div>
            
            {recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-slate-50 border-slate-200">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-slate-700">Successful Login</span>
                      <span className="text-xs text-slate-500">{formatTimestamp(activity.timestamp)}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Globe size={14}/> {activity.ipAddress}</span>
                      <span className="flex items-center gap-1"><MapPin size={14}/> {activity.deviceType}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">No recent activity found.</p>
              </div>
            )}
            
            <div className="mt-12 pt-6 border-t border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Security Tips</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5" />
                  <span>Check the URL for the secure "https" lock icon.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5" />
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