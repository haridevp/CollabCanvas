import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { Sidebar } from '../components/Sidebar';
import {
  Shield, Lock, Key, Trash2, AlertTriangle, User
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import DeletionSurveyModal from '../components/DeletionSurveyModal';
import { requestAccountDeletion } from '../services/accountDeletionService';
import { toggle2FA } from '../utils/authService';

/**
 * SecurityPage - Account security and danger zone
 * 
 * Standalone page for password management, 2FA, active sessions,
 * and account deletion. Extracted from the Security tab of ProfilePage.
 */
const SecurityPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [showPasswordConfirm, setShowPasswordConfirm] = useState<boolean>(false);
  const [showSurveyModal, setShowSurveyModal] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [deletionReason, setDeletionReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState<string>('');
  const [isToggling2FA, setIsToggling2FA] = useState<boolean>(false);

  const handleToggle2FA = async (): Promise<void> => {
    setIsToggling2FA(true);
    try {
      const result = await toggle2FA();
      if (result.success) {
        updateUser({ twoFactorEnabled: result.twoFactorEnabled });
      } else {
        alert(result.message || 'Failed to toggle 2FA.');
      }
    } catch (error) {
      alert('An error occurred while toggling 2FA.');
    } finally {
      setIsToggling2FA(false);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    if (!password) { alert('Please enter your password'); return; }
    if (deleteConfirmationText !== 'DELETE') { alert('Please type "DELETE"'); return; }

    setIsDeleting(true);
    try {
      const result = await requestAccountDeletion({ email: user?.email, password });
      if (result.success) {
        alert('Account deleted.');
        window.location.href = '/login';
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Deletion failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteAccount = (): void => {
    setShowPasswordConfirm(false);
    setPassword('');
    setDeleteConfirmationText('');
    setDeletionReason('');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your account security and privacy settings.
          </p>
        </header>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
          <div className="space-y-6">
            {/* Password Change Section */}
            <div className="p-6 border border-slate-100 dark:border-slate-700 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="text-slate-600 dark:text-slate-400" size={20} />
                <h4 className="font-semibold text-slate-800 dark:text-white">Password</h4>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Change your password to keep your account secure.
              </p>
              <Button className="gap-2" onClick={() => navigate('/reset-password')}>
                <Key size={16} /> Change Password
              </Button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="p-6 border border-slate-100 dark:border-slate-700 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className="text-slate-600 dark:text-slate-400" size={20} />
                  <h4 className="font-semibold text-slate-800 dark:text-white">Two-Factor Authentication</h4>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${user?.twoFactorEnabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {user?.twoFactorEnabled ? 'Enabled' : 'Not Enabled'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Add an extra layer of security to your account.
              </p>
              <Button variant="outline" className="gap-2" onClick={handleToggle2FA} isLoading={isToggling2FA}>
                <Shield size={16} /> {user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </Button>
            </div>

            {/* Active Sessions */}
            <div className="p-6 border border-slate-100 dark:border-slate-700 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <User className="text-slate-600 dark:text-slate-400" size={20} />
                <h4 className="font-semibold text-slate-800 dark:text-white">Active Sessions</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">Chrome on Windows</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Current session • Just now</p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">Safari on iPhone</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">2 days ago</p>
                  </div>
                  <Button variant="outline" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    Revoke
                  </Button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 p-6 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
                <h3 className="text-red-800 dark:text-red-300 font-bold">Danger Zone</h3>
              </div>

              {showPasswordConfirm ? (
                <div className="space-y-4">
                  <div className="p-4 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg">
                    <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">⚠️ Confirm Account Deletion</h4>
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                      This action cannot be undone. All your data will be permanently deleted.
                    </p>

                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                          Enter your password to confirm
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                         
                          className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-700 text-red-800 dark:text-red-300"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                          Reason for leaving (optional)
                        </label>
                        <select
                          value={deletionReason}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-700 text-red-800 dark:text-red-300"
                        >
                          <option value="">Select a reason...</option>
                          <option value="not-useful">Didn't find it useful</option>
                          <option value="too-complex">Too complicated to use</option>
                          <option value="privacy-concerns">Privacy concerns</option>
                          <option value="found-alternative">Found a better alternative</option>
                          <option value="other">Other reason</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                          Type "DELETE" to confirm
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmationText}
                          onChange={(e) => setDeleteConfirmationText(e.target.value)}
                         
                          className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-700 text-red-800 dark:text-red-300 uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleDeleteAccount}
                      isLoading={isDeleting}
                      className="bg-red-600 hover:bg-red-700 border-none gap-2"
                    >
                      <Trash2 size={16} /> Yes, Delete My Account
                    </Button>
                    <Button
                      onClick={cancelDeleteAccount}
                      variant="outline"
                      className="border-slate-300 dark:border-slate-600"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-red-600 dark:text-red-400 text-sm mb-4">
                    Once you delete your account, there is no going back. All your data will be permanently removed.
                  </p>
                  <Button
                    onClick={() => setShowPasswordConfirm(true)}
                    className="bg-red-600 hover:bg-red-700 border-none gap-2"
                  >
                    <Trash2 size={16} /> Delete Account Permanently
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <DeletionSurveyModal
        isOpen={showSurveyModal}
        onClose={() => setShowSurveyModal(false)}
        onComplete={() => window.location.href = '/'}
        userEmail={user?.email || ''}
      />
    </div>
  );
};

export default SecurityPage;
