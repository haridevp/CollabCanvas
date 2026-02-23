import React from 'react';

/**
 * PrivacyPolicyContent component - Displays the Privacy Policy content
 * 
 * @component
 * @returns {JSX.Element} Privacy Policy content with proper formatting
 */
export const PrivacyPolicyContent: React.FC = () => {
    return (
        <div className="prose prose-invert max-w-none text-slate-200">
            <h2 className="text-2xl font-bold text-white mb-4">Privacy Policy</h2>

            <p className="text-slate-400 mb-4 text-xs italic">
                <strong>Last Updated:</strong> February 11, 2026
            </p>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">1. Information We Collect</h3>
                <ul className="list-disc list-inside text-slate-400 text-[13px] ml-4 space-y-1">
                    <li><strong className="text-white">Account:</strong> Name, email address, username</li>
                    <li><strong className="text-white">Profile:</strong> Optional details you provide</li>
                    <li><strong className="text-white">Content:</strong> Projects and collaboration data</li>
                </ul>
            </section>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">2. How We Use Data</h3>
                <ul className="list-disc list-inside text-slate-400 text-[13px] ml-4 space-y-1">
                    <li>Maintain and improve services</li>
                    <li>Send technical notices and updates</li>
                    <li>Respond to questions and support needs</li>
                    <li>Monitor and analyze trends</li>
                </ul>
            </section>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">3. Information Sharing</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    We do not sell your personal information. We share data only with consent, with service providers, or for legal requirements.
                </p>
            </section>

            <section className="mb-6 border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Contact Us</h3>
                <p className="text-slate-300 text-sm">
                    Questions? Email us at{' '}
                    <a href="mailto:privacy@collabcanvas.com" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
                        privacy@collabcanvas.com
                    </a>
                </p>
            </section>
        </div>
    );
};
