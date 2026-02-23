import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import Background from '../components/ui/Background';
import TitleAnimation from '../components/ui/TitleAnimation';

const RegistrationSuccess: React.FC = () => {
  const location = useLocation();
  const email = location.state?.email || "your email";

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Dynamic Background */}
      <Background />

      {/* Floating Title */}
      <div className="absolute top-12 left-0 w-full text-center z-10 pointer-events-none mb-24">
        <TitleAnimation />
      </div>

      <div className="w-full max-w-md z-20 mt-32">
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

          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Mail className="text-blue-600" size={32} />
          </div>

          <h1 className="text-xl font-bold text-black border-t-2 border-black pt-2 inline-block mb-4">
            Check Your Email
          </h1>

          <div role="alert">
            <p className="text-slate-600 text-xs mb-2">
              We've sent a verification link to:
            </p>
            <p className="font-bold text-black bg-slate-50 p-3 rounded-lg mb-6 border border-slate-200 text-sm">
              {email}
            </p>
          </div>

          <div className="space-y-4">
            <div role="region" aria-label="Next steps instructions" className="bg-slate-50 p-4 rounded-lg text-left border border-slate-100">
              <h3 className="font-bold text-black text-xs uppercase tracking-wider mb-2">Next steps:</h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0" />
                  <span>Click the link in the email to activate your account.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0" />
                  <span>Check your spam folder if you don't see it within a few minutes.</span>
                </li>
              </ul>
            </div>

            <Link
              to="/login"
              aria-label="Return to login page"
              className="flex items-center justify-center gap-2 text-blue-600 hover:text-purple-700 font-bold text-sm transition-colors uppercase tracking-wider pt-2"
            >
              Back to Login
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
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

export default RegistrationSuccess;
