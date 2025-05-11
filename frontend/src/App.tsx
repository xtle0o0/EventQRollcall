import { useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';

// Pages
import Dashboard from './pages/Dashboard';
import ScannerPage from './pages/ScannerPage';
import WorkshopsPage from './pages/WorkshopsPage';
import GuestsPage from './pages/GuestsPage';
import AttestationsPage from './pages/AttestationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AttendancePage from './pages/AttendancePage';

// Layout
import Layout from './components/Layout';

// Context Providers
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, AuthContext } from './context/AuthContext';

// Components for route protection
import RoleRoute from './components/RoleRoute';

// Protected route component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  const location = useLocation();

  if (isLoading) {
    // Show loading screen while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    // Redirect to login page if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// App routes setup
const AppRoutes = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    // Initialize local storage with empty data if not present
    if (!localStorage.getItem('workshops')) {
      localStorage.setItem('workshops', JSON.stringify([]));
    }
    if (!localStorage.getItem('guests')) {
      localStorage.setItem('guests', JSON.stringify([]));
    }
    if (!localStorage.getItem('attendance')) {
      localStorage.setItem('attendance', JSON.stringify([]));
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        
        {/* Scanner page - accessible by both admin and scanner */}
        <Route path="/scan" element={
          <RoleRoute allowedRoles={['admin', 'scanner']}>
            <ScannerPage />
          </RoleRoute>
        } />
        
        {/* Admin-only pages */}
        <Route path="/workshops" element={
          <RoleRoute allowedRoles={['admin']}>
            <WorkshopsPage />
          </RoleRoute>
        } />
        
        <Route path="/guests" element={
          <RoleRoute allowedRoles={['admin']}>
            <GuestsPage />
          </RoleRoute>
        } />
        
        <Route path="/attestations" element={
          <RoleRoute allowedRoles={['admin']}>
            <AttestationsPage />
          </RoleRoute>
        } />

        <Route path="/attendance" element={
          <RoleRoute allowedRoles={['admin', 'scanner']}>
            <AttendancePage />
          </RoleRoute>
        } />
        
        <Route path="/analytics" element={
          <RoleRoute allowedRoles={['admin']}>
            <AnalyticsPage />
          </RoleRoute>
        } />
        
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
