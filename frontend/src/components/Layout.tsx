import { useState, useEffect, useContext } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Award, BookOpen, ChartBar, House, LogOut, Menu, QrCode, Users, X, ClipboardCheck } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { } = useContext(ThemeContext);
  const { user, logout, hasRole } = useContext(AuthContext);

  // Close sidebar on location change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <House size={20} />, roles: ['admin', 'scanner'] },
    { path: '/scan', label: 'Scan QR', icon: <QrCode size={20} />, roles: ['admin', 'scanner'] },
    { path: '/workshops', label: 'Workshops', icon: <BookOpen size={20} />, roles: ['admin'] },
    { path: '/guests', label: 'Guests', icon: <Users size={20} />, roles: ['admin'] },
    { path: '/attendance', label: 'Attendance', icon: <ClipboardCheck size={20} />, roles: ['admin', 'scanner'] },
    { path: '/attestations', label: 'Attestations', icon: <Award size={20} />, roles: ['admin'] },
    { path: '/analytics', label: 'Analytics', icon: <ChartBar size={20} />, roles: ['admin'] },
  ];

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => hasRole(item.roles));

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      {/* Mobile Header */}
      <header className="bg-white dark:bg-neutral-800 shadow-subtle dark:shadow-dark-subtle py-3 px-4 flex justify-between items-center md:hidden border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-50">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">EventTrackr</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar - Desktop permanent, Mobile overlay */}
        <aside
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:translate-x-0 transition-transform duration-300 ease-in-out
            fixed md:sticky top-0 left-0 h-screen w-72 bg-white dark:bg-neutral-800 z-50 
            shadow-subtle dark:shadow-dark-subtle border-r border-neutral-200 dark:border-neutral-700
            flex flex-col overflow-hidden
          `}
        >
          <div className="p-4 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-8 mt-2">
              <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">EventTrackr</h1>
              <div className="flex items-center">
                <ThemeToggle className="mr-1" />
                <button 
                  onClick={() => setSidebarOpen(false)} 
                  className="p-1.5 md:hidden rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto">
              <ul className="space-y-1.5">
                {filteredNavItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => `
                        flex items-center px-4 py-2.5 rounded-lg transition-colors 
                        ${isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }
                      `}
                    >
                      <span className="mr-3 flex-shrink-0 opacity-80">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {user && (
              <div className="mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="px-4 py-3 rounded-lg bg-neutral-50 dark:bg-neutral-750">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-medium">
                        {user.name.charAt(0)}
                      </div>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{user.name}</p>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300' 
                            : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-300'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={logout}
                      className="ml-auto p-1.5 text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300 
                                hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full"
                      title="Log out"
                      aria-label="Log out"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 mt-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">© <a href="https://github.com/xtle0o0" className="hover:underline">xtle0o0</a> & <a href="https://wa.me/+212605788425" className="hover:underline">t3j_z</a></p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Backdrop when sidebar is open on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-neutral-900 bg-opacity-50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
