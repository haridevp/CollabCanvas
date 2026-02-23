import React from 'react';

/**
 * TermsOfServiceContent component - Displays the Terms of Service content
 * 
 * @component
 * @returns {JSX.Element} Terms of Service content with proper formatting
 */
export const TermsOfServiceContent: React.FC = () => {
    return (
        <div className="prose prose-invert max-w-none text-slate-200">
            <h2 className="text-2xl font-bold text-white mb-4">Terms of Service</h2>

            <p className="text-slate-400 mb-4 text-xs italic">
                <strong>Last Updated:</strong> February 11, 2026
            </p>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">1. Acceptance of Terms</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    By accessing and using CollabCanvas ("the Service"), you accept and agree to be bound by the terms
                    and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
            </section>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">2. Use License</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-2">
                    Permission is granted to temporarily access the materials on CollabCanvas
                    for personal, non-commercial transitory viewing only. Under this license you may not:
                </p>
                <ul className="list-disc list-inside text-slate-400 text-[13px] ml-4 space-y-1">
                    <li>Modify or copy the materials</li>
                    <li>Use the materials for any commercial purpose</li>
                    <li>Attempt to reverse engineer any software</li>
                    <li>Remove any copyright or other proprietary notations</li>
                </ul>
            </section>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">3. User Account</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-2">
                    To access certain features, you must register for an account. You agree to:
                </p>
                <ul className="list-disc list-inside text-slate-400 text-[13px] ml-4 space-y-1">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain the security of your password</li>
                    <li>Notify us immediately of any unauthorized use</li>
                </ul>
            </section>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">4. User Content</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    You retain all rights to any content you submit. By submitting content, you grant us a worldwide, non-exclusive license to process and display such content.
                </p>
            </section>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">5. Prohibited Activities</h3>
                <ul className="list-disc list-inside text-slate-400 text-[13px] ml-4 space-y-1">
                    <li>Violating laws or regulations</li>
                    <li>Infringing on intellectual property</li>
                    <li>Transmitting viruses or malicious code</li>
                    <li>Harassing other users</li>
                </ul>
            </section>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">6. Termination</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    We may terminate or suspend your account immediately, without prior notice, for any reason whatsoever.
                </p>
            </section>

            <section className="mb-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">7. Limitation of Liability</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                    CollabCanvas shall not be liable for any indirect, incidental, or special damages arising out of your use of the Service.
                </p>
            </section>

            <section className="mb-6 border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Contact</h3>
                <p className="text-slate-300 text-sm">
                    Questions? Email us at{' '}
                    <a href="mailto:support@collabcanvas.com" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
                        support@collabcanvas.com
                    </a>
                </p>
            </section>
        </div>
    );
};
