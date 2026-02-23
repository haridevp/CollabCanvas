import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
import { initializeTheme } from './utils/theme';
import RegisterPage from './pages/RegisterPage';
import RegistrationSuccess from './pages/RegistrationSuccess'; // NEW
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
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
 * 
 * @example
 * ```tsx
 * // In main.tsx or index.tsx
 * import React from 'react';
 * import ReactDOM from 'react-dom/client';
 * import App from './App';
 * 
 * ReactDOM.createRoot(document.getElementById('root')).render(
 *   <React.StrictMode>
 *     <App />
 *   </React.StrictMode>
 * );
 * ```
 * 
 * @remarks
 * Key responsibilities:
 * 1. Sets up React Router for client-side navigation
 * 2. Wraps app with AuthProvider for authentication state management
 * 3. Defines all public and protected routes
 * 4. Handles redirects for undefined routes
 * 5. Configures basename for deployment subpaths
 * 
 * Route structure:
 * - Public routes: Login, Register, Password reset, Legal pages
 * - Protected routes: Dashboard, Profile, Rooms (require authentication)
 * - Special routes: Email verification, Registration success
 * - Redirects: Root path and 404 fallback
 */
function App() {
  useEffect(() => {
    // Initialize theme including system preference listener
    const cleanup = initializeTheme();
    return cleanup;
  }, []);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    // Wrap entire application with authentication provider
    // AuthProvider makes authentication state available to all child components
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/registration-success" element={<RegistrationSuccess />} />

            {/* Other Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/room/:id" element={<RoomPage />} />
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;