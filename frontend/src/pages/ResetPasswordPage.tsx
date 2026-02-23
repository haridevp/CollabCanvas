import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter';
import { resetPassword } from '../utils/authService';
import Background from '../components/ui/Background';
import TitleAnimation from '../components/ui/TitleAnimation';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError("No reset token found. Please request a new link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) return;

    setIsLoading(true);
    try {
      const result = await resetPassword(token, password);
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSuccessScreen = () => (
    <div className="bg-white rounded-xl shadow-2xl p-8 text-center border border-slate-100 flex flex-col justify-center">
      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
        <CheckCircle className="text-green-600" size={32} />
      </div>
      <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block mb-4">Password Updated</h1>
      <p className="text-slate-600 text-xs mb-6 px-4">
        Your password has been reset successfully. Redirecting you to the login page...
      </p>
      <Button
        onClick={() => navigate('/login')}
        className="w-full py-3 bg-black hover:bg-slate-800 text-white font-semibold rounded-lg transition-all shadow-md active:scale-[0.98] border-none"
      >
        Go to Login
      </Button>
    </div>
  );

  const renderResetForm = () => (
    <div className="bg-white rounded-xl shadow-2xl p-6 border border-slate-100 flex flex-col justify-center">
      <div className="mb-6">
        <Link
          to="/login"
          className="text-blue-600 hover:text-purple-700 flex items-center gap-2 text-xs font-bold transition-colors uppercase tracking-wider"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Login
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
        <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block">Set New Password</h1>
        <p className="text-slate-600 text-xs mt-1">Create a secure password</p>
      </div>

      {error && (
        <div role="alert" className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-600" size={18} aria-hidden="true" />
          <span className="text-red-700 text-xs font-medium">{error}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 px-1">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-200 rounded-lg text-black focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm"
              disabled={isLoading || (!!error && !token)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <PasswordStrengthMeter password={password} className="mt-2" />

        <div>
          <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 px-1">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-black focus:ring-1 focus:ring-black focus:border-black outline-none transition-all text-sm"
              disabled={isLoading || (!!error && !token)}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full py-3 bg-black hover:bg-slate-800 text-white font-semibold rounded-lg transition-all shadow-md active:scale-[0.98] mt-2 border-none"
          isLoading={isLoading}
          disabled={isLoading || !token}
        >
          Update Password
        </Button>
      </form>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Dynamic Background */}
      <Background />

      {/* Floating Title */}
      <div className="absolute top-12 left-0 w-full text-center z-10 pointer-events-none mb-24">
        <TitleAnimation />
      </div>

      <div className="w-full max-w-md z-20 mt-32">
        {isSuccess ? renderSuccessScreen() : renderResetForm()}
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-4 text-[10px] text-slate-400 font-medium tracking-tight uppercase z-10">
        &copy; 2026 CollabCanvas v1.0.0
      </div>
    </div>
  );
};

export default ResetPasswordPage;
