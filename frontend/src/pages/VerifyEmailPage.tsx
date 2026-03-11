import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import Background from '../components/ui/Background';
import TitleAnimation from '../components/ui/TitleAnimation';
import axios from 'axios';

type VerifyStatus = 'loading' | 'success' | 'already_verified' | 'error';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL. Please use the link from your email.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const { data } = await axios.post(`${apiUrl}/auth/verify-email`, { token });

        if (data.success) {
          if (data.message?.toLowerCase().includes('already')) {
            setStatus('already_verified');
            setMessage('Your account is already verified. You can log in now.');
          } else {
            setStatus('success');
            setMessage('Your email has been verified successfully! You can now log in.');
          }
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. Please try again.');
        }
      } catch (err: any) {
        const errMsg = err.response?.data?.message || 'Verification failed. The link may have expired.';
        setStatus('error');
        setMessage(errMsg);
      }
    };

    verifyEmail();
  }, [searchParams]);

  const renderIcon = () => {
    if (status === 'loading') {
      return <Loader2 className="text-blue-500 animate-spin" size={48} />;
    }
    if (status === 'success' || status === 'already_verified') {
      return <CheckCircle className="text-green-500" size={48} />;
    }
    return <XCircle className="text-red-500" size={48} />;
  };

  const renderTitle = () => {
    if (status === 'loading') return 'Verifying Email...';
    if (status === 'success') return 'Email Verified!';
    if (status === 'already_verified') return 'Already Verified';
    return 'Verification Failed';
  };

  const bgColor = () => {
    if (status === 'loading') return 'bg-blue-50 border-blue-100';
    if (status === 'success' || status === 'already_verified') return 'bg-green-50 border-green-100';
    return 'bg-red-50 border-red-100';
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <Background />

      <div className="absolute top-12 left-0 w-full text-center z-10 pointer-events-none mb-24">
        <TitleAnimation />
      </div>

      <div className="w-full max-w-md z-20 mt-32">
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-slate-100 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-6">
            <img
              src="/CollabCanvas/logo.png"
              alt="CollabCanvas Logo"
              style={{ height: '56px', width: 'auto' }}
              className="object-contain mx-auto"
            />
          </div>

          {/* Status Icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border ${bgColor()}`}>
            {renderIcon()}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block mb-4">
            {renderTitle()}
          </h1>

          {/* Message */}
          <p className="text-slate-600 text-sm mb-8 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          {status !== 'loading' && (
            <div className="w-full space-y-3">
              {(status === 'success' || status === 'already_verified') && (
                <Link
                  to="/login"
                  className="block w-full py-3 bg-black hover:bg-slate-800 text-white font-semibold rounded-lg transition-all shadow-md active:scale-[0.98] text-sm text-center"
                >
                  Go to Login
                </Link>
              )}
              {status === 'error' && (
                <>
                  <Link
                    to="/register"
                    className="block w-full py-3 bg-black hover:bg-slate-800 text-white font-semibold rounded-lg transition-all shadow-md active:scale-[0.98] text-sm text-center"
                  >
                    Register Again
                  </Link>
                  <Link
                    to="/login"
                    className="block w-full py-3 bg-white border border-slate-200 text-slate-700 hover:border-black hover:text-black font-semibold rounded-lg transition-all text-sm text-center"
                  >
                    Back to Login
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Help text for loading */}
          {status === 'loading' && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail size={14} />
              <span>Please wait while we verify your account...</span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 text-[10px] text-slate-400 font-medium tracking-tight uppercase z-10">
        &copy; 2026 CollabCanvas v1.0.0
      </div>
    </div>
  );
};

export default VerifyEmailPage;
