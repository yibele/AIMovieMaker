'use client';

import { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore, initializeTheme } from '@/lib/theme-store';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  
  // 初始化主题
  useEffect(() => {
    initializeTheme();
  }, []);
  
  return (
    <button
      onClick={toggleTheme}
      className="
        p-2.5 rounded-xl
        bg-white/80 dark:bg-slate-800/80
        backdrop-blur-sm
        border border-slate-200 dark:border-slate-700
        shadow-lg shadow-black/5 dark:shadow-black/20
        hover:bg-white dark:hover:bg-slate-700
        hover:scale-105 active:scale-95
        transition-all duration-200
        group
      "
      title={theme === 'light' ? '切换到夜晚模式' : '切换到白天模式'}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-slate-600 group-hover:text-violet-600 transition-colors" />
      ) : (
        <Sun className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
      )}
    </button>
  );
}

