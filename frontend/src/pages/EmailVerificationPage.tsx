import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { verifyEmailToken } from '../utils/authService';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const { token: pathToken } = useParams(); // Catch /verify-email/:token
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');
  
  // Ref to prevent double-calling the API (React 18 StrictMode issue)
  const hasCalled = useRef(false);

  // Use the token from the query (?token=) OR from the path (/:token)
  const token = searchParams.get('token') || pathToken;

  useEffect(() => {
    const verify = async () => {
      // 1. Check if token exists
      if (!token) {
        setStatus('failed');
        setMessage('No verification token found. Please check your email link.');
        return;
      }

      // 2. Prevent double execution (This often causes "Activation Failed" on the second hidden call)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
        {status === 'verifying' && (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold">Verifying Your Account</h2>
          </div>
        )}
        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-green-700">Success!</h2>
            <p className="text-slate-600">{message}</p>
          </div>
        )}
        {status === 'failed' && (
          <div className="space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-700">Activation Failed</h2>
            <p className="text-slate-600">{message}</p>
            <p className="text-xs text-slate-400 mt-2">If you already verified, try logging in.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPage;