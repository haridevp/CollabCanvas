import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

/**
 * AdminRoute Component
 * A wrapper for securing admin-only react-router routes.
 * 
 * If the user is unauthenticated, they will be redirected to the login page.
 * If the user is authenticated but not an admin, they will be redirected to the dashboard.
 * If the user is an admin, the protected child components are rendered.
 */
interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    // Redirect unauthenticated users to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'admin') {
    // Redirect non-admin authenticated users to the general dashboard
    // using state to pass a message could be useful if the dashboard supports it
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
