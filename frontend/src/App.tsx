import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
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
  return (
    // Wrap entire application with authentication provider
    // AuthProvider makes authentication state available to all child components
    <AuthProvider>
      {/* 
        React Router setup with basename configuration
        basename is configured from environment for deployment flexibility
      */}
      <Router basename={import.meta.env.BASE_URL}>
        <Routes>
          {/* 
            Root path redirect: Redirects from "/" to "/login"
            replace prevents browser history entry for the redirect
          */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* 
            ======================
            Authentication Routes
            ======================
            These routes are accessible without authentication
          */}
          
          {/* User login page */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* User registration page */}
          <Route path="/register" element={<RegisterPage />} />
          
          {/* 
            Registration Success Page (NEW)
            Intermediate page shown after successful registration
            Provides feedback and next steps for new users
          */}
          <Route path="/registration-success" element={<RegistrationSuccess />} />
          
          {/* Password recovery flow */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* 
            Email verification landing page
            Users arrive here after clicking verification links in emails
          */}
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          
          {/* 
            ======================
            Legal & Compliance Routes
            ======================
            Public legal documentation pages
          */}
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          
          {/* 
            ======================
            Protected Application Routes
            ======================
            These routes should be protected by authentication guards
            In production, consider adding route guards or protected route components
          */}
          
          {/* Main application dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* User profile management */}
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* 
            Collaborative room workspace
            Dynamic route with room ID parameter
            Accessible at: /room/:id where :id is the room identifier
          */}
          <Route path="/room/:id" element={<RoomPage />} />
          
          {/* 
            ======================
            Fallback & Error Routes
            ======================
            Handles undefined paths (404 equivalent)
          */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;