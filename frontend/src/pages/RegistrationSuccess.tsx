import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';

const RegistrationSuccess = () => {
  const location = useLocation();
  const email = location.state?.email || "your email";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="text-blue-600" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
        <p className="text-slate-600 mb-6">
          We've sent a verification link to <br/>
          <span className="font-semibold text-slate-900">{email}</span>
        </p>
        <div className="bg-blue-50 p-4 rounded-lg mb-8 text-sm text-blue-800 text-left">
          <strong>Next steps:</strong>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Click the link in the email to activate.</li>
            <li>Check your spam folder if you don't see it.</li>
          </ul>
        </div>
        <Link to="/login" className="flex items-center justify-center gap-2 text-blue-600 font-semibold hover:underline">
          Back to Login <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
};

export default RegistrationSuccess;