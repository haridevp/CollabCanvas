import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
// Updated to use the correct service we built
import { forgotPassword } from '../utils/authService';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState('');

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return 'Please enter your email address';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call our backend via authService
      const result = await forgotPassword(email);
      
      if (result.success) {
        setSuccess(true);
        setEmailSent(email);
        setEmail('');
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="mb-6">
            <Link to="/login" className="text-slate-400 hover:text-blue-600 flex items-center gap-2 text-sm transition-colors">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email</h1>
            <p className="text-slate-600 mb-4">We've sent a password reset link to:</p>
            <p className="font-medium text-slate-800 bg-slate-50 p-3 rounded-lg mb-6">{emailSent}</p>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <h3 className="font-medium text-blue-800 mb-2">What's next?</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Click the link in the email to reset your password</li>
                  <li>• The link will expire in 1 hour for security</li>
                  <li>• Check your spam folder if you don't see it</li>
                </ul>
              </div>
              
              <Button onClick={() => setSuccess(false)} variant="outline" className="w-full">
                Try Different Email
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="mb-6">
          <Link to="/login" className="text-slate-400 hover:text-blue-600 flex items-center gap-2 text-sm transition-colors">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="text-slate-500">Enter your email and we'll send a reset link.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-600" size={18} />
            <span className="text-red-700 text-sm font-medium">{error}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
              <input 
                id="email"
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full py-3" isLoading={isLoading} disabled={isLoading}>
            Send Reset Link
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;