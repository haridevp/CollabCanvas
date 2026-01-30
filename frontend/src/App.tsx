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
 * App component - Main application router and entry point
 * Defines all application routes and wraps the app with required providers
 */
function App() {
  return (
    // Wrap entire application with authentication provider
    <AuthProvider>
      {/* React Router for client-side routing */}
      <Router>
        <Routes>
          {/* Redirect root path to login page */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* NEW: Intermediate page shown after hitting 'Sign Up' */}
          <Route path="/registration-success" element={<RegistrationSuccess />} />
          
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          {/* Email verification landing page */}
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          
          {/* Legal pages */}
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          
          {/* Protected application routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/room/:id" element={<RoomPage />} />
          
          {/* Fallback route for undefined paths */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;