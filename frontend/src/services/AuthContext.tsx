import React, { createContext, useContext, useState } from 'react';

/**
 * Interface representing the authentication context structure
 * @interface AuthContextType
 */
interface AuthContextType {
  /** Current authenticated user object or null if not authenticated */
  user: any;
  /** Authentication token string or null if not authenticated */
  token: string | null;
  /** Function to log in a user with token and user data */
  login: (token: string, userData: any) => void;
  /** Function to log out the current user */
  logout: () => void;
  /** Function to update the current user's data */
  updateUser: (data: any) => void;
}

/**
 * React context for authentication state management
 * @constant {React.Context<AuthContextType | undefined>} AuthContext
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider component that manages user authentication state
 * 
 * This provider component:
 * 1. Manages authentication token and user data in state
 * 2. Persists authentication data to localStorage
 * 3. Provides authentication methods to child components
 * 4. Handles automatic initialization from localStorage
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with auth context
 * 
 * @example
 * ```tsx
 * // Wrap your app with AuthProvider
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * 
 * // Use auth in any component
 * const { user, login, logout } = useAuth();
 * ```
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /**
   * State for authentication token
   * Initialized from localStorage if available
   * @state {string | null} token
   */
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));

  /**
   * State for user data
   * Initialized from localStorage with JSON parsing error handling
   * @state {any} user
   */
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  /**
   * Logs in a user by setting authentication state
   * 
   * @function login
   * @param {string} newToken - Authentication token from server
   * @param {any} userData - User data object from server
   * 
   * @example
   * ```tsx
   * // Usage after successful API login
   * const response = await loginApi(email, password);
   * login(response.token, response.user);
   * ```
   */
  const login = (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  /**
   * Logs out the current user by clearing authentication state
   * 
   * This function:
   * 1. Clears token and user state
   * 2. Removes authentication data from localStorage
   * 3. Redirects to login page
   * 
   * @function logout
   * 
   * @example
   * ```tsx
   * // Logout button handler
   * <button onClick={logout}>Logout</button>
   * ```
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.assign('/login');
  };

  /**
   * Updates the current user's data
   * 
   * This function:
   * 1. Merges new data with existing user data
   * 2. Updates user state
   * 3. Persists updated user data to localStorage
   * 
   * @function updateUser
   * @param {any} data - Partial user data to merge with existing user
   * 
   * @example
   * ```tsx
   * // Update user profile
   * updateUser({ 
   *   name: 'New Name',
   *   avatar: 'new-avatar-url' 
   * });
   * ```
   */
  const updateUser = (data: any) => {
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access authentication context
 * 
 * This hook provides access to the authentication context values
 * and ensures it's used within an AuthProvider
 * 
 * @function useAuth
 * @returns {AuthContextType} Authentication context values
 * @throws {Error} If used outside of AuthProvider
 * 
 * @example
 * ```tsx
 * // Access auth in functional components
 * const { user, token, login, logout, updateUser } = useAuth();
 * 
 * // Check authentication status
 * const isAuthenticated = !!user && !!token;
 * ```
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};