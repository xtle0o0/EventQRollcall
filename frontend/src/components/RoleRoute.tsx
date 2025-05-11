import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

interface RoleRouteProps {
  children: JSX.Element;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * A wrapper component that checks if the current user has the required role to access a route
 * Redirects to unauthorized page or specified redirect path if user doesn't have permission
 */
const RoleRoute = ({ 
  children, 
  allowedRoles, 
  redirectTo = '/unauthorized' 
}: RoleRouteProps) => {
  const { hasRole, isLoading } = useContext(AuthContext);
  const location = useLocation();

  if (isLoading) {
    // Show loading screen while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!hasRole(allowedRoles)) {
    // Redirect to unauthorized page with information about the attempted path
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children;
};

export default RoleRoute; 