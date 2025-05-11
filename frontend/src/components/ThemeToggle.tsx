import { useContext, useState, useRef, useEffect } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { Moon, Sun, Monitor, ChevronDown } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  size?: number;
}

const ThemeToggle = ({ className = '', size = 20 }: ThemeToggleProps) => {
  const { theme, actualTheme, setTheme } = useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon based on theme
  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={size} />;
      case 'dark': return <Moon size={size} />;
      case 'system': return <Monitor size={size} />;
      default: return <Sun size={size} />;
    }
  };

  // Get label based on theme
  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
      default: return 'Light';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors duration-200 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-100 dark:focus:ring-offset-neutral-800 focus:ring-primary-500
          ${actualTheme === 'dark' 
            ? 'bg-neutral-750 text-neutral-100 hover:bg-neutral-700' 
            : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
          }`}
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <span className="sr-only">Current theme: {getThemeLabel()}</span>
        
        <div className="flex items-center gap-2">
          {getThemeIcon()}
          <span className="text-sm font-medium hidden sm:inline">{getThemeLabel()}</span>
        </div>
        
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50 animate-fade-in">
          <button
            onClick={() => { setTheme('light'); setIsOpen(false); }}
            className={`w-full flex items-center px-3 py-2 text-sm text-left ${theme === 'light' ? 'bg-neutral-100 dark:bg-neutral-700 text-primary-600 dark:text-primary-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          >
            <Sun size={size - 2} className="mr-2" />
            Light
          </button>
          <button
            onClick={() => { setTheme('dark'); setIsOpen(false); }}
            className={`w-full flex items-center px-3 py-2 text-sm text-left ${theme === 'dark' ? 'bg-neutral-100 dark:bg-neutral-700 text-primary-600 dark:text-primary-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          >
            <Moon size={size - 2} className="mr-2" />
            Dark
          </button>
          <button
            onClick={() => { setTheme('system'); setIsOpen(false); }}
            className={`w-full flex items-center px-3 py-2 text-sm text-left ${theme === 'system' ? 'bg-neutral-100 dark:bg-neutral-700 text-primary-600 dark:text-primary-400' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          >
            <Monitor size={size - 2} className="mr-2" />
            System
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle; 