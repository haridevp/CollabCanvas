import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, AtSign } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';
import { UsernameChecker } from '../components/ui/UsernameChecker';
import { useState } from 'react';
import { registerUser } from '../utils/authService';
import { validateEmailFormat } from '../utils/emailValidation';
import { openInNewTab } from '../utils/navigation';

/**
 * RegisterPage component - User registration page
 * Allows new users to create an account with password strength validation
 */
const RegisterPage = () => {
  const navigate = useNavigate();
  
  // Form state management
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);
  const [emailValidation, setEmailValidation] = useState<{
    valid: boolean;
    message: string;
  }>({ valid: false, message: '' });

  /**
   * Opens legal links in a new tab
   */
  const openTermsOfService = () => openInNewTab('/terms-of-service');
  const openPrivacyPolicy = () => openInNewTab('/privacy-policy');

  /**
   * Validates email on change
   */
  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    const validation = validateEmailFormat(newEmail);
    setEmailValidation(validation);
  };

  /**
   * Handles registration form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Basic Field Validation
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    
    // 2. Specialized Validation
    if (!isUsernameAvailable) {
      alert('Please choose an available username');
      return;
    }
    
    if (!emailValidation.valid) {
      alert(emailValidation.message || 'Please enter a valid email address');
      return;
    }
    
    if (!agreeToTerms) {
      alert('You must agree to the Terms of Service and Privacy Policy');
      return;
    }
    
    if (password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsLoading(true);
      
      // Connect to your actual Backend Service
      const result = await registerUser({ 
        fullName, 
        username: username.toLowerCase().trim(), 
        email: email.toLowerCase().trim(), 
        password 
      });
      
      if (result.success) {
        // Redirect to the success notice page we created earlier
        navigate('/registration-success', { 
          state: { 
            email, 
            message: 'Registration successful! Please check your email.' 
          } 
        });
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      alert(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        
        {/* Header section with icon */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="text-blue-600" size={32} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create an Account</h1>
          <p className="text-slate-500">Join the Collaborative Canvas platform</p>
        </div>

        {/* Registration form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          
          {/* Full name input */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-slate-400" size={20} aria-hidden="true" />
            <input 
              type="text" 
              placeholder="Full Name" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
              disabled={isLoading}
            />
          </div>
          
          {/* Username input */}
          <div className="relative">
            <AtSign className="absolute left-3 top-3 text-slate-400" size={20} aria-hidden="true" />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
              disabled={isLoading}
            />
          </div>
          
          <UsernameChecker 
            username={username}
            onAvailabilityChange={setIsUsernameAvailable}
          />
          
          {/* Email input */}
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-400" size={20} aria-hidden="true" />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                email && !emailValidation.valid ? 'border-red-300' : 'border-slate-200'
              }`}
              required
              disabled={isLoading}
            />
          </div>
          
          {email && !emailValidation.valid && (
            <div className="text-xs text-red-600 px-1">{emailValidation.message}</div>
          )}

          {/* Password input */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400" size={20} aria-hidden="true" />
            <input 
              type="password" 
              placeholder="Password (min. 8 characters)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>
          
          <PasswordStrengthMeter password={password} className="mt-2" />

          {/* Terms and conditions agreement */}
          <div className="flex items-start gap-2 py-2">
            <input 
              type="checkbox" 
              id="terms" 
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              className="mt-1"
              required
              disabled={isLoading}
            />
            <label htmlFor="terms" className="text-sm text-slate-500">
              I agree to the{' '}
              <button 
                type="button" 
                className="text-blue-600 hover:underline focus:outline-none"
                onClick={openTermsOfService}
              >
                Terms of Service
              </button>
              {' '}and{' '}
              <button 
                type="button" 
                className="text-blue-600 hover:underline focus:outline-none"
                onClick={openPrivacyPolicy}
              >
                Privacy Policy
              </button>.
            </label>
          </div>

          <Button 
            type="submit" 
            className="w-full py-3 text-lg"
            isLoading={isLoading}
            disabled={isLoading || !isUsernameAvailable || !emailValidation.valid || !agreeToTerms}
          >
            Sign Up
          </Button>
        </form>

        <p className="text-center mt-6 text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;