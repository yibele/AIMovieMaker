import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // 启用 class 模式的 dark mode
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
        morpheus: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
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
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 7s ease-in-out 2s infinite',
        'float-slow': 'float 10s ease-in-out 1s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'blur-in-up': 'blurInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'enter-spin-out': 'enterSpinOut 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'sheen': 'sheen 3s ease-in-out infinite',
        'modal-spring': 'modalSpring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'dash-draw': 'dashDraw 30s linear infinite',
        'dash-draw-fast': 'dashDraw 9s linear infinite',
        'cursor-blink': 'cursorBlink 1s step-end infinite',
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
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        blurInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px) scale(0.95)', filter: 'blur(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' }
        },
        enterSpinOut: {
          '0%': { opacity: '0', transform: 'scale(0.5) rotate(-45deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0)' }
        },
        sheen: {
          '0%, 100%': { left: '-100%', opacity: '0' },
          '50%': { opacity: '0.5' },
          '100%': { left: '200%', opacity: '0' }
        },
        modalSpring: {
          '0%': { opacity: '0', transform: 'scale(0.8) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        dashDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' }
        },
        cursorBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        }
      },
    },
  },
  plugins: [],
};
export default config;

