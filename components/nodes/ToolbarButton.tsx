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
    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ease-out hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100';
  const variantClass =
    variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';

  return (
    <button
      {...rest}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`${baseClass} ${variantClass} ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// 行级注释：统一工具栏分割线
export function ToolbarDivider() {
  return <div className="h-6 w-px bg-gray-200" />;
}

