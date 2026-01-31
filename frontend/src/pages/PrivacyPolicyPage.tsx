import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Database } from 'lucide-react';
import { Button } from '../components/ui/Button';

/**
 * PrivacyPolicyPage component
 * Displays the Privacy Policy for the Collaborative Canvas platform
 */
const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-blue-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-200">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
            <p className="text-slate-700 mb-3">
              Collaborative Canvas ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
            <p className="text-slate-700">
              Please read this privacy policy carefully. By using Collaborative Canvas, you consent to the practices described in this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Information We Collect</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Database className="text-blue-600 mr-2" size={20} />
                  <h3 className="font-semibold text-slate-800">Personal Information</h3>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                  <li>Name and email address</li>
                  <li>Username and profile picture</li>
                  <li>Account preferences and settings</li>
                  <li>Communication preferences</li>
                </ul>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Eye className="text-blue-600 mr-2" size={20} />
                  <h3 className="font-semibold text-slate-800">Usage Information</h3>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                  <li>Canvas creations and edits</li>
                  <li>Collaboration session data</li>
                  <li>Device and browser information</li>
                  <li>IP address and location data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. How We Use Your Information</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 font-medium mb-2">We use collected information to:</p>
              <ul className="list-disc pl-5 space-y-1 text-blue-800">
                <li>Provide and maintain our service</li>
                <li>Enable real-time collaboration features</li>
                <li>Improve and personalize user experience</li>
                <li>Communicate important updates and notifications</li>
                <li>Ensure platform security and prevent abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Data Sharing and Disclosure</h2>
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-slate-800 mb-2">We do not sell your personal data.</h3>
              <p className="text-slate-700">
                We may share information with:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 mt-2">
                <li>Service providers who assist in platform operation</li>
                <li>Other users in collaborative sessions (username and actions only)</li>
                <li>Legal authorities when required by law</li>
                <li>Third parties in business transfers (merger/acquisition)</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Data Security</h2>
            <div className="flex items-start mb-4">
              <Lock className="text-green-600 mt-1 mr-3 flex-shrink-0" size={24} />
              <div>
                <p className="text-slate-700 mb-2">
                  We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                </p>
                <p className="text-slate-700 text-sm">
                  While we strive to protect your information, no electronic transmission or storage method is 100% secure. We cannot guarantee absolute security.
                </p>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Your Data Protection Rights</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 p-3 text-left font-semibold text-slate-800">Right</th>
                    <th className="border border-slate-200 p-3 text-left font-semibold text-slate-800">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Access</td>
                    <td className="border border-slate-200 p-3 text-slate-700">Request copies of your personal data</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Rectification</td>
                    <td className="border border-slate-200 p-3 text-slate-700">Request correction of inaccurate data</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Erasure</td>
                    <td className="border border-slate-200 p-3 text-slate-700">Request deletion of your personal data</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-3 text-slate-700">Restriction</td>
                    <td className="border border-slate-200 p-3 text-slate-700">Request restriction of data processing</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 p-3 text-slate-700">Objection</td>
                    <td className="border border-slate-200 p-3 text-slate-700">Object to our processing of your data</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Children's Privacy</h2>
            <p className="text-slate-700">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          {/* Contact Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Contact Us</h2>
            <p className="text-slate-700 mb-3">
              If you have questions about this Privacy Policy or our data practices, please contact our Data Protection Officer:
            </p>
            <div className="mt-2 p-4 bg-slate-50 rounded-lg">
              <p className="text-slate-700">
                <strong>Email:</strong> privacy@collaborativecanvas.com
              </p>
              <p className="text-slate-700 mt-1">
                <strong>Address:</strong> 123 Creative Street, Design City, DC 12345
              </p>
            </div>
          </section>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-8 border-t border-slate-200">
            <Link to="/register">
              <Button className="w-full sm:w-auto">
                Back to Registration
              </Button>
            </Link>
            <Link to="/terms-of-service">
              <Button variant="outline" className="w-full sm:w-auto">
                View Terms of Service
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-slate-500">
          <p>
            This Privacy Policy may be updated periodically. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;