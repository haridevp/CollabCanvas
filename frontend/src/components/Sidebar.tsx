import { useState } from 'react';
import { LayoutDashboard, User, Users, Settings, LogOut, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

/**
 * Sidebar component - Main navigation sidebar for the application
 * Provides navigation links to different sections and sign out functionality
 */
export const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Handles user sign out process with confirmation
   */
  const handleSignOutClick = () => {
    setShowLogoutConfirm(true);
  };

  /**
   * Confirms and executes sign out
   */
  const confirmSignOut = async () => {
    setIsLoggingOut(true);
    
    try {
      // Simulate API call for sign out (in production, this would call backend)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Execute logout
      logout();
      
      // Close modal
      setShowLogoutConfirm(false);
      
      // Navigate to login page
      navigate('/login');
      
      // Show success feedback
      setTimeout(() => {
        alert('You have been successfully signed out.');
      }, 100);
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Navigation menu items configuration
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Rooms', path: '/rooms' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0 flex flex-col p-4">
        {/* Application logo/brand section */}
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <PlusCircle size={24} aria-hidden="true" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">CanvasCollab</span>
        </div>

        {/* User profile section */}
        <div className="px-3 py-4 mb-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden">
              <img 
                src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} 
                alt="User avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 dark:text-white truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>

        {/* Main navigation menu */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors group"
              aria-label={`Navigate to ${item.label}`}
            >
              <item.icon 
                size={20} 
                className="group-hover:text-blue-600 dark:group-hover:text-blue-400" 
                aria-hidden="true" 
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sign out button */}
        <button 
          onClick={handleSignOutClick}
          className="flex items-center gap-3 px-3 py-2.5 mt-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
          aria-label="Sign out of your account"
          disabled={isLoggingOut}
        >
          <LogOut 
            size={20} 
            className="group-hover:animate-pulse" 
            aria-hidden="true" 
          />
          <span className="font-medium">
            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          </span>
        </button>

        {/* Version info */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            v1.0.0 • CanvasCollab
          </p>
        </div>
      </aside>

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Sign Out"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <LogOut className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
            <div>
              <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">
                Are you sure you want to sign out?
              </p>
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                You will be signed out from this device. You'll need to sign in again to access your account.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={confirmSignOut}
              isLoading={isLoggingOut}
              disabled={isLoggingOut}
              className="w-full gap-2 bg-red-600 hover:bg-red-700 border-none"
              aria-label="Confirm sign out"
            >
              <LogOut size={18} /> Yes, Sign Out
            </Button>
            <Button
              onClick={() => setShowLogoutConfirm(false)}
              variant="outline"
              className="w-full"
              disabled={isLoggingOut}
              aria-label="Cancel sign out"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};