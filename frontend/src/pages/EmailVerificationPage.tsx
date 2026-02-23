import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { verifyEmailToken } from '../utils/authService';
import Background from '../components/ui/Background';
import TitleAnimation from '../components/ui/TitleAnimation';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { token: pathToken } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');
  const hasCalled = useRef(false);
  const token = searchParams.get('token') || pathToken;

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('failed');
        setMessage('No verification token found. Please check your email link.');
        return;
      }

      if (hasCalled.current) return;
      hasCalled.current = true;

      try {
        const result = await verifyEmailToken(token);
        if (result.success) {
          setStatus('success');
          setMessage(result.message);
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('failed');
          setMessage(result.message || 'Verification failed.');
        }
      } catch (err) {
        setStatus('failed');
        setMessage('Connection error. Please try again.');
      }
    };

    verify();
  }, [token, navigate]);

  const renderContent = () => {
    return (
      <div className="bg-white rounded-xl shadow-2xl p-8 border border-slate-100 flex flex-col justify-center text-center">
        {/* Header section with brand logo */}
        <div className="mb-6">
          <div className="mb-4 flex justify-center">
            <img
              src="/CollabCanvas/logo.png"
              alt="CollabCanvas Logo"
              style={{ height: '64px', width: 'auto' }}
              className="object-contain mx-auto"
            />
          </div>
        </div>

        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block">Verifying Your Account</h1>
            <p className="text-slate-600 text-xs mt-1">Please wait while we validate your link</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block">Success!</h1>
            <p className="text-slate-600 text-xs px-4">{message}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Redirecting to login...</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <XCircle className="text-red-500" size={32} />
            </div>
            <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block">Activation Failed</h1>
            <p className="text-slate-600 text-xs px-4">{message}</p>

            <div className="pt-4">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-purple-700 font-bold text-sm transition-colors uppercase tracking-wider"
              >
                Go to Login
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
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

export default EmailVerificationPage;
