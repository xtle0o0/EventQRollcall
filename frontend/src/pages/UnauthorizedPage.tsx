import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
              <ShieldAlert size={32} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h1>
          
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            You don't have permission to access this page. Your current role is{' '}
            <span className="font-semibold">{user?.role || 'unknown'}</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              <ArrowLeft size={16} className="mr-2" />
              Go Back
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              <Home size={16} className="mr-2" />
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage; 