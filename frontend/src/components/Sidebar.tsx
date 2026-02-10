import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  User,
  Users,
  Settings,
  LogOut,
  PlusCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { performLogout } from "../utils/logoutHandler";
import { NotificationCenter } from "./ui/NotificationCenter";
import api from "../api/axios";

export const Sidebar = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userData, setUserData] = useState(user);

  // Sync profile data from backend
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get("/auth/profile");
        if (response.data.success) {
          setUserData(response.data.user);
          updateUser(response.data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setUserData(user);
      }
    };

    if (user?.id) {
      fetchUserProfile();
    }
  }, [user?.id, updateUser]);

  const handleSignOutClick = () => setShowLogoutConfirm(true);

  const confirmSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await performLogout({
        showConfirmation: false,
        showSuccess: true,
        redirectTo: "/login",
      });
      setShowLogoutConfirm(false);
      navigate("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      alert("Failed to sign out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Rooms", path: "/rooms" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <>
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0 flex flex-col p-4">
        <div className="flex items-center justify-between gap-2 px-2 mb-8">
          <div className="flex items-center gap-2 flex-1">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <PlusCircle size={24} aria-hidden="true" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">
              CollabCanvas
            </span>
          </div>
          <NotificationCenter />
        </div>

        {/* User Profile Info */}
        <div className="px-3 py-4 mb-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 overflow-hidden">
              <img
                src={userData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.fullName || "User"}`}
                alt="User avatar"
                className="w-full h-full object-cover"
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

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors group"
            >
              <item.icon size={20} className="group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <button
          onClick={handleSignOutClick}
          disabled={isLoggingOut}
          className="flex items-center gap-3 px-3 py-2.5 mt-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group w-full text-left"
        >
          <LogOut size={20} className="group-hover:animate-pulse" />
          <span className="font-medium">
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </span>
        </button>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">v1.0.0 • CollabCanvas</p>
        </div>
      </aside>

      <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Confirm Sign Out">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <LogOut className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
            <div>
              <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">Are you sure you want to sign out?</p>
              <p className="text-blue-700 dark:text-blue-400 text-sm">You will need to sign in again to access your account.</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button onClick={confirmSignOut} isLoading={isLoggingOut} className="w-full bg-red-600 hover:bg-red-700 border-none">
              Yes, Sign Out
            </Button>
            <Button onClick={() => setShowLogoutConfirm(false)} variant="outline" className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};