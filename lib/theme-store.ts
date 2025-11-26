import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// 从 localStorage 加载主题
const loadTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  
  try {
    const saved = localStorage.getItem('aimovimaker_theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // 检测系统主题偏好
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (error) {
    console.error('加载主题失败:', error);
  }
  
  return 'light';
};

// 应用主题到 DOM
const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  // 保存到 localStorage
  try {
    localStorage.setItem('aimovimaker_theme', theme);
  } catch (error) {
    console.error('保存主题失败:', error);
  }
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'light', // 初始值，会在客户端被 loadTheme 覆盖
  
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  
  toggleTheme: () => {
    const currentTheme = get().theme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    set({ theme: newTheme });
  },
}));

// 初始化主题（客户端）
export const initializeTheme = () => {
  if (typeof window === 'undefined') return;
  
  const theme = loadTheme();
  applyTheme(theme);
  useThemeStore.setState({ theme });
};

