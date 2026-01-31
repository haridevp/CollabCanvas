import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

/**
 * TermsOfServicePage component
 * Displays the Terms of Service for the Collaborative Canvas platform
 */
const TermsOfServicePage = () => {
  const handleAcceptTerms = () => {
    // This would typically be handled during registration
    // For now, navigate back to registration
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-blue-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-200">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-3">
              Welcome to Collaborative Canvas. By accessing or using our platform, you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access the service.
            </p>
          </section>

          {/* User Accounts */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. User Accounts</h2>
            <ul className="space-y-3 text-slate-700">
              <li className="flex items-start">
                <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={18} />
                <span>You must be at least 13 years old to use this service.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={18} />
                <span>You are responsible for maintaining the confidentiality of your account and password.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={18} />
                <span>You agree to accept responsibility for all activities that occur under your account.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={18} />
                <span>You must provide accurate and complete information when creating your account.</span>
              </li>
            </ul>
          </section>

          {/* Content Guidelines */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Content Guidelines</h2>
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">Prohibited Content:</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>Content that violates any laws or regulations</li>
                <li>Hate speech, harassment, or discrimination</li>
                <li>Copyrighted material without permission</li>
                <li>Malicious software or code</li>
                <li>Spam or unauthorized advertising</li>
                <li>Personal information of others without consent</li>
              </ul>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Intellectual Property</h2>
            <p className="text-slate-700 mb-3">
              The Collaborative Canvas platform and its original content, features, and functionality are owned by Collaborative Canvas and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-slate-700">
              You retain ownership of the content you create on the platform, but grant us a license to host, display, and distribute your content through our services.
            </p>
          </section>

          {/* Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Privacy</h2>
            <p className="text-slate-700 mb-3">
              Your privacy is important to us. Please read our <Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link> which explains how we collect, use, and protect your personal information.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Termination</h2>
            <p className="text-slate-700">
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Changes to Terms</h2>
            <p className="text-slate-700">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page and updating the "Last updated" date.
            </p>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Contact Us</h2>
            <p className="text-slate-700">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="mt-2 p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-700">
                <strong>Email:</strong> legal@collaborativecanvas.com
              </p>
              <p className="text-slate-700 mt-1">
                <strong>Address:</strong> 123 Creative Street, Design City, DC 12345
              </p>
            </div>
          </section>

          {/* Acceptance Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-8 border-t border-slate-200">
            <Button
              onClick={handleAcceptTerms}
              className="w-full sm:w-auto"
            >
              <CheckCircle className="mr-2" size={20} />
              I Accept the Terms
            </Button>
            <Link to="/register">
              <Button variant="outline" className="w-full sm:w-auto">
                Back to Registration
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-slate-500">
          <p>
            By using Collaborative Canvas, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;