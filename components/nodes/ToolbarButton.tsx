'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ToolbarButtonProps = {
  icon: ReactNode;
  label: string;
  variant?: 'default' | 'danger';
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

// 行级注释：统一节点工具栏按钮样式
export function ToolbarButton({
  icon,
  label,
  variant = 'default',
  className = '',
  onClick,
  ...rest
}: ToolbarButtonProps) {
  const baseClass =
    'flex items-center justify-center w-9 h-9 text-xs font-medium rounded-xl transition-all duration-200 ease-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100';
  const variantClass =
    variant === 'danger' 
      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30' 
      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white';

  return (

    <div className="relative group">
      <button
        {...rest}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        className={`${baseClass} ${variantClass} ${className}`}
      >
        {icon}
      </button>

      {/* Tooltip - 上方弹出 */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/90 backdrop-blur-sm text-white text-[10px] font-medium rounded-md opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
        {label}
        {/* 小箭头 */}
        <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-900/90 rotate-45" />
      </div>
    </div>
  );
}

// 行级注释：统一工具栏分割线
export function ToolbarDivider() {
  return <div className="h-6 w-px bg-gray-200 dark:bg-slate-600" />;
}

