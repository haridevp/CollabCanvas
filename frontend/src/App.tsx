
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
import { ThemeManager } from './components/ThemeManager';
import RegisterPage from './pages/RegisterPage';
import RegistrationSuccess from './pages/RegistrationSuccess'; // NEW
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import AppearancePage from './pages/AppearancePage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import KeyboardShortcutsPage from './pages/KeyboardShortcutsPage';
import SecurityPage from './pages/SecurityPage';
import RoomPage from './pages/RoomPage';
import { GoogleOAuthProvider } from '@react-oauth/google';

/**
 * Main Application Component
 * 
 * The App component serves as the root component and main router for the application.
 * It defines all application routes, handles navigation, and wraps the entire
 * application with necessary providers (AuthProvider, Router).
 * 
 * @component
 * @returns {JSX.Element} The rendered application with routing setup
 */
function App() {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <ThemeManager />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/registration-success" element={<RegistrationSuccess />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Main App Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/appearance" element={<AppearancePage />} />
            <Route path="/notification-settings" element={<NotificationSettingsPage />} />
            <Route path="/keyboard-shortcuts" element={<KeyboardShortcutsPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/room/:id" element={<RoomPage />} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;