import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'toolbar-pop': 'toolbar-pop 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        'loading-shimmer': 'loading-shimmer 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'loading-pulse': 'loading-pulse 2.5s ease-in-out infinite',
        'loading-gradient-shift': 'loading-gradient-shift 4s ease-in-out infinite',
        'loading-breathe': 'loading-breathe 3s ease-in-out infinite',
      },
      keyframes: {
        'toolbar-pop': {
          '0%': { opacity: '0', transform: 'translateX(-50%) translateY(8px) scale(0.94)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0) scale(1)' },
        },
        'loading-shimmer': {
          '0%': { transform: 'translateX(-150%) translateY(-150%) rotate(0deg)' },
          '100%': { transform: 'translateX(150%) translateY(150%) rotate(0deg)' },
        },
        'loading-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.92' },
        },
        'loading-gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'loading-breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.005)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;

