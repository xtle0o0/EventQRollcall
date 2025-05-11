import { Link } from 'react-router-dom';
import { House } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">The page you are looking for doesn't exist.</p>
      <Link
        to="/"
        className="flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
      >
        <House size={20} className="mr-2" />
        Return House
      </Link>
    </div>
  );
};

export default NotFoundPage;
