import { createContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, getAuthToken, setAuthToken, removeAuthToken, fetchUserProfile } from '../utils/api';

interface User {
  username: string;
  name: string;
  role: string;
  id?: string;
  loginHistory?: any[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  hasRole: (roles: string | string[]) => boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  isLoading: true,
  hasRole: () => false,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in on initial load
    const checkAuth = async () => {
      const token = getAuthToken();
      
      if (token) {
        try {
          // Fetch user profile with token
          const data = await fetchUserProfile();
          
          if (data && data.user) {
            // Extract user data from profile response
            const userData: User = {
              id: data.user.id,
              username: data.user.username,
              name: data.user.username, // Using username as name if not provided
              role: data.user.role || 'scanner', // Use role from API or default to scanner
              loginHistory: data.user.loginHistory || [],
            };
            
            setUser(userData);
          }
        } catch (error) {
          console.error('Authentication error:', error);
          removeAuthToken();
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  // Listen for storage events (in case of login/logout in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        if (!e.newValue) {
          // Token was removed, log out
          setUser(null);
        } else if (!localStorage.getItem('authToken')) {
          // Token was added in another tab
          const userData = localStorage.getItem('user');
          if (userData) {
            try {
              setUser(JSON.parse(userData));
            } catch (e) {
              // Handle invalid JSON
            }
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Call the backend API for authentication using the utility function
      const data = await loginUser(username, password);
      
      if (!data.token) {
        setIsLoading(false);
        return false;
      }
      
      // Store JWT token
      setAuthToken(data.token);
      
      // Create user object from the response
      const user: User = {
        id: data.user.id,
        username: data.user.username,
        name: data.user.username, // Using username as name if not provided
        role: data.user.role || 'scanner', // Use role from API or default to scanner
        loginHistory: data.user.loginHistory || [],
      };
      
      // Store user info in state
      setUser(user);
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    // Use replace to prevent going back to protected page after logout
    navigate('/login', { replace: true });
  };

  // Function to check if user has a specific role
  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    
    // Convert to array if single role string provided
    const roleArray = typeof roles === 'string' ? [roles] : roles;
    
    // Admin can access everything
    if (user.role === 'admin') return true;
    
    // Check if user's role is in the list of allowed roles
    return roleArray.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
