/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Main brand color
        primary: {
          50: '#f0f7ff',
          100: '#e0f0fe',
          200: '#bce3fd',
          300: '#90cffc',
          400: '#5eb6f8',
          500: '#3b99f5',
          600: '#277ae8',
          700: '#2062d6',
          800: '#1d51ad',
          900: '#1d4686',
          950: '#162b54',
        },
        // Secondary accent color for highlights
        secondary: {
          50: '#f1f8fe',
          100: '#e2eefd',
          200: '#bcd9fa',
          300: '#8abbf5',
          400: '#4f93ee',
          500: '#2970e4',
          600: '#1c55d3',
          700: '#1943ac',
          800: '#1a398c',
          900: '#1b3372',
          950: '#152049',
        },
        // Success color
        success: {
          50: '#effdf5',
          100: '#d7fadf',
          200: '#b2f2c4',
          300: '#83e49e',
          400: '#4dcc70',
          500: '#2ab150',
          600: '#1a913e',
          700: '#177334',
          800: '#175b2d',
          900: '#154b27',
          950: '#052e17',
        },
        // Warning color
        warning: {
          50: '#fffbeb',
          100: '#fff4c6',
          200: '#ffe989',
          300: '#ffd44d',
          400: '#ffc122',
          500: '#f6a009',
          600: '#dd7a02',
          700: '#b75505',
          800: '#94420c',
          900: '#7a370e',
          950: '#461b03',
        },
        // Error color
        error: {
          50: '#fef2f2',
          100: '#ffe1e1',
          200: '#ffc9c9',
          300: '#fea3a3',
          400: '#fc6f6f',
          500: '#f53e3e',
          600: '#e12121',
          700: '#bd1919',
          800: '#9d1919',
          900: '#831b1b',
          950: '#480a0a',
        },
        // Extended neutral colors for better dark mode
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          150: '#ebedf0', // Extra light shade
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          750: '#2d3748', // Extra dark shade
          800: '#1f2937',
          850: '#18212f', // Extra dark shade
          900: '#111827',
          950: '#030712',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 2px 5px 0 rgba(0, 0, 0, 0.05)',
        'dark-subtle': '0 2px 5px 0 rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      screens: {
        'xs': '475px',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
