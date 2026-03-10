import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, User, LogOut, Palette, Bell, Keyboard, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { NotificationCenter } from './ui/NotificationCenter';
import { performLogout } from '../utils/logoutHandler';
import api from '../api/axios';

/**
 * Sidebar Component
 * 
 * Main navigation sidebar for the application providing access to core features,
 * notifications, and user account management.
 */
export const Sidebar = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userData, setUserData] = useState(user);

  // Use a ref to avoid updateUser in dependency array (prevents infinite re-renders)
  const updateUserRef = useRef(updateUser);
  updateUserRef.current = updateUser;

  /**
   * Fetch user profile from backend on mount.
   * Uses a ref for updateUser to avoid infinite re-render loop.
   */
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get("/auth/profile");
        if (response.data.success) {
          setUserData(response.data.user);
          updateUserRef.current(response.data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUserData(user);
      }
    };

    if (user?.id) {
      fetchUserProfile();
    }
  }, [user?.id]);

  const handleSignOutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await performLogout({
        showConfirmation: false,
        showSuccess: true,
        redirectTo: "/CollabCanvas/login",
      });
      setShowLogoutConfirm(false);
      navigate("/CollabCanvas/login");
    } catch (error) {
      console.error("Sign out error:", error);
      alert("Failed to sign out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Palette, label: 'Appearance', path: '/appearance' },
    { icon: Bell, label: 'Notification Settings', path: '/notification-settings' },
    { icon: Keyboard, label: 'Keyboard Shortcuts', path: '/keyboard-shortcuts' },
    { icon: Shield, label: 'Security', path: '/security' },
  ];

  return (
    <>
      <aside
        className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0 flex flex-col p-4 z-[60]"
        role="complementary"
        aria-label="Main navigation"
      >
        {/* Application logo/brand section */}
        <div className="flex items-center gap-2 px-2 mb-8">
          <img 
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="CollabCanvas logo" 
            className="w-10 h-10 object-contain"
          />
          <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">
            CollabCanvas
          </span>
        </div>

        {/* User Profile Info */}
        <div className="px-3 py-4 mb-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden"
              role="img"
              aria-label="User avatar"
            >
              <img
                src={userData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.fullName || userData?.displayName || 'User'}`}
                alt="User avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  target.parentElement!.textContent = userData?.fullName?.[0] || userData?.displayName?.[0] || 'U';
                  target.parentElement!.classList.add('text-blue-600', 'font-bold');
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 dark:text-white truncate">
                {userData?.fullName || userData?.displayName || "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {userData?.email || "user@example.com"}
              </p>
            </div>
          </div>
        </div>

        {/* Notification Center */}
        <div className="px-2 mb-4">
          <NotificationCenter />
        </div>

        {/* Main navigation menu */}
        <nav
          className="flex-1 space-y-1"
          aria-label="Primary navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Navigate to ${item.label}`}
              aria-current={window.location.pathname === item.path ? 'page' : undefined}
            >
              <item.icon
                size={20}
                className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                aria-hidden="true"
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sign out button — fixed duplicate className bug */}
        <button
          onClick={handleSignOutClick}
          disabled={isLoggingOut}
          className="flex items-center gap-3 px-3 py-2.5 mt-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Sign out of your account"
        >
          <LogOut
            size={20}
            className="group-hover:animate-pulse transition-transform"
            aria-hidden="true"
          />
          <span className="font-medium">
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </span>
        </button>

        {/* Version info footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            v1.0.0 • CollabCanvas
          </p>
        </div>
      </aside>

      <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Confirm Sign Out">
        <div className="space-y-4">
          <div
            className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
            role="alert"
            aria-label="Sign out warning"
          >
            <LogOut className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} aria-hidden="true" />
            <div>
              <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">Are you sure you want to sign out?</p>
              <p className="text-blue-700 dark:text-blue-400 text-sm">You will need to sign in again to access your account.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={confirmSignOut}
              isLoading={isLoggingOut}
              disabled={isLoggingOut}
              className="w-full gap-2 bg-red-600 hover:bg-red-700 border-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Confirm sign out"
            >
              <LogOut size={18} aria-hidden="true" /> Yes, Sign Out
            </Button>
            <Button
              onClick={() => setShowLogoutConfirm(false)}
              variant="outline"
              className="w-full focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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