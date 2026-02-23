import React, { useState, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AtSign } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';
import { UsernameChecker } from '../components/ui/UsernameChecker';
import { Modal } from '../components/ui/Modal';
import { TermsOfServiceContent } from '../components/legal/TermsOfServiceContent';
import { PrivacyPolicyContent } from '../components/legal/PrivacyPolicyContent';
import { registerUser } from '../utils/authService';
import { validateEmailFormat } from '../utils/emailValidation';
import { openInNewTab } from '../utils/navigation';
import Background from '../components/ui/Background';
import TitleAnimation from '../components/ui/TitleAnimation';

interface EmailValidationResult {
  valid: boolean;
  message: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  // Form state management
  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean>(false);
  const [emailValidation, setEmailValidation] = useState<EmailValidationResult>(
    { valid: false, message: '' }
  );

  // Modal state management
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

  const openTermsOfService = (): void => {
    setShowTermsModal(true);
    openInNewTab('/terms-of-service');
  };
  const openPrivacyPolicy = (): void => {
    setShowPrivacyModal(true);
    openInNewTab('/privacy-policy');
  };

  const handleEmailChange = (newEmail: string): void => {
    setEmail(newEmail);
    const validation = validateEmailFormat(newEmail);
    setEmailValidation(validation);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      alert('Please fill in all required fields');
      return;
    }

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
      const result = await registerUser({
        fullName,
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        password
      });

      if (result.success) {
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
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Dynamic Background */}
      <Background />

      {/* Floating Title */}
      <div className="absolute top-12 left-0 w-full text-center z-10 pointer-events-none mb-24">
        <TitleAnimation />
      </div>

      <div className="w-full max-w-md z-20 mt-32">
        <div className="bg-white rounded-xl shadow-2xl p-6 border border-slate-100 flex flex-col justify-center">

          {/* Header section with brand logo */}
          <div className="text-center mb-6">
            <div className="mb-4 flex justify-center">
              <img
                src="/CollabCanvas/logo.png"
                alt="CollabCanvas Logo"
                style={{ height: '64px', width: 'auto' }}
                className="object-contain mx-auto"
              />
            </div>
            <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block">Create Account</h1>
            <p className="text-slate-600 text-xs mt-1">Join the transformation today</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Full name input */}
            <div>
              <label htmlFor="full-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 px-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-black focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Username input */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 px-1">Username</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-black focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm"
                  required
                  disabled={isLoading}
                />
              </div>
              <UsernameChecker
                username={username}
                onAvailabilityChange={setIsUsernameAvailable}
              />
            </div>

            {/* Email input */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleEmailChange(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-lg text-black focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm ${email && !emailValidation.valid ? 'border-red-300' : 'border-slate-200'}`}
                  required
                  disabled={isLoading}
                  aria-invalid={email && !emailValidation.valid ? 'true' : 'false'}
                />
              </div>
              {email && !emailValidation.valid && (
                <p role="alert" className="text-[10px] text-red-600 px-1 mt-1 font-medium">{emailValidation.message}</p>
              )}
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" title="Password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} aria-hidden="true" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-black focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
              </div>
              <PasswordStrengthMeter password={password} className="mt-2" />
            </div>

            {/* Terms and conditions agreement */}
            <div className="flex items-start gap-2 py-1">
              <input
                type="checkbox"
                id="terms"
                aria-label="Agree to terms and conditions"
                checked={agreeToTerms}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAgreeToTerms(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 text-black rounded border-slate-300 focus:ring-black accent-black"
                required
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-xs text-slate-600 font-medium leading-tight">
                I agree to the{' '}
                <button
                  type="button"
                  aria-label="Open Terms of Service"
                  className="text-blue-600 hover:text-purple-700 font-bold transition-colors"
                  onClick={openTermsOfService}
                >
                  Terms
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  aria-label="Open Privacy Policy"
                  className="text-blue-600 hover:text-purple-700 font-bold transition-colors"
                  onClick={openPrivacyPolicy}
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full py-3 bg-black hover:bg-slate-800 text-white font-semibold rounded-lg transition-all shadow-md active:scale-[0.98] mt-2 border-none"
              isLoading={isLoading}
              disabled={isLoading || !isUsernameAvailable || !emailValidation.valid || !agreeToTerms}
            >
              Sign Up
            </Button>
          </form>

          <p className="text-center mt-6 text-slate-600 text-sm">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-600 font-bold hover:text-purple-700 transition-colors"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* Terms of Service Modal */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms of Service"
      >
        <div className="bg-slate-800 text-white rounded-lg p-6">
          <TermsOfServiceContent />
        </div>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
      >
        <div className="bg-slate-800 text-white rounded-lg p-6">
          <PrivacyPolicyContent />
        </div>
      </Modal>

      {/* Footer hint */}
      <div className="absolute bottom-4 text-[10px] text-slate-400 font-medium tracking-tight uppercase z-10">
        &copy; 2026 CollabCanvas v1.0.0
      </div>
    </div>
  );
};

export default RegisterPage;
