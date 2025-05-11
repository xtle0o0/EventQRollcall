import { createContext, useState, useEffect, ReactNode } from 'react';

type ThemeType = 'light' | 'dark' | 'system';
type ActualThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  actualTheme: ActualThemeType;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  actualTheme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Theme preference can be 'light', 'dark', or 'system'
  const [theme, setTheme] = useState<ThemeType>(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme-preference');
    if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
      return savedTheme as ThemeType;
    }
    return 'system'; // Default to system preference
  });
  
  // The actual theme applied (always 'light' or 'dark')
  const [actualTheme, setActualTheme] = useState<ActualThemeType>('light');
  
  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        setActualTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    
    // Set initial value
    handleChange();
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    // Clean up
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  
  // Update actual theme when theme preference changes
  useEffect(() => {
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setActualTheme(systemPrefersDark ? 'dark' : 'light');
    } else {
      setActualTheme(theme as ActualThemeType);
    }
  }, [theme]);
  
  // Apply theme to document
  useEffect(() => {
    // Add transition class for smooth theme changes
    document.documentElement.classList.add('transition-colors');
    document.documentElement.classList.add('duration-300');
    
    if (actualTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    
    // Store preference (not the actual theme)
    localStorage.setItem('theme-preference', theme);
  }, [actualTheme, theme]);

  const toggleTheme = () => {
    // Cycle through themes: light -> dark -> system -> light
    setTheme(prevTheme => {
      if (prevTheme === 'light') return 'dark';
      if (prevTheme === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
